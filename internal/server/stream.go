package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// handleEvalStream is a Server-Sent Events endpoint that pushes evaluated flag
// values for a context and re-pushes them whenever the environment changes.
//
// It is a raw handler (not a typed huma operation) because SSE doesn't fit the
// request/response model. Auth is by SDK key; browsers (EventSource can't set
// headers) may pass ?sdk_key= and ?context= as query params.
//
//	GET /api/v1/eval/stream?context=<json>          (X-SDK-Key header), or
//	GET /api/v1/eval/stream?sdk_key=<key>&context=<json>
func (s *Server) handleEvalStream(w http.ResponseWriter, r *http.Request) {
	sdkKey := r.Header.Get("X-SDK-Key")
	if sdkKey == "" {
		sdkKey = r.URL.Query().Get("sdk_key")
	}
	if sdkKey == "" {
		http.Error(w, "missing SDK key", http.StatusUnauthorized)
		return
	}
	key, err := s.resolveSDKKey(r.Context(), sdkKey)
	if err != nil {
		http.Error(w, "invalid SDK key", http.StatusUnauthorized)
		return
	}
	clientOnly := key.Kind == "client"

	var raw map[string]any
	if err := json.Unmarshal([]byte(r.URL.Query().Get("context")), &raw); err != nil || len(raw) == 0 {
		http.Error(w, "context query param (JSON) is required", http.StatusBadRequest)
		return
	}
	evalCtx, err := toContext(raw)
	if err != nil {
		http.Error(w, "invalid context", http.StatusBadRequest)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	changed, cancel := s.flags.SubscribeEnv(key.EnvironmentID)
	defer cancel()

	send := func() {
		vals := s.flags.EvaluateAll(key.EnvironmentID, evalCtx, clientOnly)
		payload, _ := json.Marshal(map[string]any{"flags": vals})
		fmt.Fprintf(w, "event: put\ndata: %s\n\n", payload)
		flusher.Flush()
	}
	send() // initial snapshot

	keepalive := time.NewTicker(30 * time.Second)
	defer keepalive.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-changed:
			send()
		case <-keepalive.C:
			fmt.Fprint(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}
