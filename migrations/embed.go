// Package migrations embeds the goose SQL migration files into the binary so a
// single image can migrate itself (e.g. as a Kubernetes init container running
// `server migrate up`).
package migrations

import "embed"

// FS holds every .sql migration in this directory.
//
//go:embed *.sql
var FS embed.FS
