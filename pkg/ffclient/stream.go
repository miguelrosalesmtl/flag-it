package ffclient

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// Watch opens a live stream and invokes onUpdate with the full flag map on the
// initial snapshot and on every change, until ctx is cancelled or the connection
// drops. It blocks; run it in a goroutine. Callers typically keep a local cache
// updated from onUpdate and serve reads from it.
func (c *Client) Watch(ctx context.Context, evalCtx Context, onUpdate func(map[string]Evaluation)) error {
	ctxJSON, err := json.Marshal(evalCtx)
	if err != nil {
		return err
	}
	u := c.baseURL + "/api/v1/eval/stream?context=" + url.QueryEscape(string(ctxJSON))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-SDK-Key", c.sdkKey)
	req.Header.Set("Accept", "text/event-stream")

	// A stream must not use the client's request timeout; ctx controls its life.
	streamHTTP := &http.Client{Transport: c.http.Transport}
	resp, err := streamHTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("ffclient: stream status %d", resp.StatusCode)
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1<<20)
	var data strings.Builder
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case strings.HasPrefix(line, "data:"):
			data.WriteString(strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
		case line == "": // event boundary
			if data.Len() == 0 {
				continue
			}
			var payload struct {
				Flags map[string]Evaluation `json:"flags"`
			}
			if err := json.Unmarshal([]byte(data.String()), &payload); err == nil {
				onUpdate(payload.Flags)
			}
			data.Reset()
		}
	}
	return scanner.Err()
}
