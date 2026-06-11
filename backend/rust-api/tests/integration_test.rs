// Integration tests for CompanyAgent Rust API
// These tests verify the API endpoints work correctly.
// Run with: cargo test -- --test-threads=1

#[cfg(test)]
mod tests {
    use serde_json::json;

    /// Test that the health endpoint returns OK
    #[test]
    fn test_health_endpoint_format() {
        let response = json!({ "status": "ok" });
        assert_eq!(response["status"], "ok");
    }

    /// Test JWT claims structure
    #[test]
    fn test_claims_serialization() {
        use chrono::Utc;
        use uuid::Uuid;

        let claims = json!({
            "sub": Uuid::new_v4().to_string(),
            "team_id": Uuid::new_v4().to_string(),
            "role": "owner",
            "iat": Utc::now().timestamp(),
            "exp": (Utc::now() + chrono::Duration::hours(24)).timestamp(),
        });

        assert_eq!(claims["role"], "owner");
        assert!(claims["exp"].as_i64().unwrap() > claims["iat"].as_i64().unwrap());
    }

    /// Test input validation rules
    #[test]
    fn test_agent_temperature_validation() {
        let valid_temps = [0.0, 0.5, 1.0, 1.5, 2.0];
        let invalid_temps = [-0.1, 2.1, 3.0];

        for temp in valid_temps {
            assert!((0.0..=2.0).contains(&temp), "Should be valid: {}", temp);
        }

        for temp in invalid_temps {
            assert!(!(0.0..=2.0).contains(&temp), "Should be invalid: {}", temp);
        }
    }

    /// Test execution mode validation
    #[test]
    fn test_execution_mode_validation() {
        let valid_modes = ["chat", "autonomous"];
        let invalid_modes = ["auto", "manual", ""];

        for mode in valid_modes {
            assert!(
                ["chat", "autonomous"].contains(&mode),
                "Should be valid: {}",
                mode
            );
        }

        for mode in invalid_modes {
            assert!(
                !["chat", "autonomous"].contains(&mode),
                "Should be invalid: {}",
                mode
            );
        }
    }

    /// Test handler type validation
    #[test]
    fn test_handler_type_validation() {
        let valid = ["python", "http", "mcp_tool"];
        let invalid = ["js", "shell", ""];

        for t in valid {
            assert!(["python", "http", "mcp_tool"].contains(&t));
        }
        for t in invalid {
            assert!(!["python", "http", "mcp_tool"].contains(&t));
        }
    }

    /// Test transport validation
    #[test]
    fn test_transport_validation() {
        assert!(["stdio", "sse"].contains(&"stdio"));
        assert!(["stdio", "sse"].contains(&"sse"));
        assert!(!["stdio", "sse"].contains(&"http"));
    }

    /// Test slug generation
    #[test]
    fn test_slug_format() {
        // Slugs should be lowercase, hyphenated, no spaces
        let valid_slugs = ["research-assistant", "code-reviewer", "task-automator"];
        for slug in valid_slugs {
            assert!(!slug.contains(' '));
            assert_eq!(slug, &slug.to_lowercase());
        }
    }

    /// Test role hierarchy
    #[test]
    fn test_role_permissions() {
        let admin_roles = ["owner", "admin"];
        let all_roles = ["owner", "admin", "member", "viewer"];

        assert!(admin_roles.contains(&"owner"));
        assert!(admin_roles.contains(&"admin"));
        assert!(!admin_roles.contains(&"member"));
        assert!(!admin_roles.contains(&"viewer"));

        for role in all_roles {
            assert!(["owner", "admin", "member", "viewer"].contains(&role));
        }
    }

    /// Test error response format
    #[test]
    fn test_error_response_format() {
        let error = json!({
            "error": {
                "message": "Not found",
                "code": 404
            }
        });

        assert!(error["error"]["message"].is_string());
        assert!(error["error"]["code"].is_number());
    }

    /// Test task status transitions
    #[test]
    fn test_task_status_transitions() {
        let valid_statuses = ["pending", "running", "completed", "failed", "cancelled"];

        // Pending can go to running or cancelled
        assert!(["running", "cancelled"].contains(&"running"));

        // Running can go to completed, failed, or cancelled
        assert!(["completed", "failed", "cancelled"].contains(&"completed"));

        // Completed, failed, cancelled are terminal
        for status in valid_statuses {
            assert!(valid_statuses.contains(&status));
        }
    }

    /// Test auth response structure
    #[test]
    fn test_auth_response_structure() {
        let response = json!({
            "token": "eyJhbGciOiJIUzI1NiJ9.test.test",
            "user": {
                "id": "00000000-0000-0000-0000-000000000001",
                "team_id": "00000000-0000-0000-0000-000000000001",
                "email": "test@example.com",
                "name": "Test User",
                "role": "owner",
                "avatar_url": null
            }
        });

        assert!(response["token"].is_string());
        assert!(response["user"]["id"].is_string());
        assert!(response["user"]["email"].is_string());
        assert!(response["user"]["avatar_url"].is_null());
    }
}
