package models

// Member is a user's membership in a organization, with their organization-scoped role (if
// any). Flattened for the members list.
type Member struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"` // organization-scoped role key, or "" if none
}
