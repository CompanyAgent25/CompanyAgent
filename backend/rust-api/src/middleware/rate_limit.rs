use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct RateLimiter {
    requests: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: u64,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: u64, window_secs: u64) -> Self {
        Self {
            requests: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    pub async fn check(&self, key: &str) -> bool {
        let mut requests = self.requests.lock().await;
        let now = Instant::now();

        let entry = requests.entry(key.to_string()).or_default();

        // Remove expired entries
        entry.retain(|&t| now.duration_since(t) < self.window);

        if entry.len() as u64 >= self.max_requests {
            return false;
        }

        entry.push(now);
        true
    }

    /// Periodic cleanup of old entries to prevent memory leak
    pub fn start_cleanup(self) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60));
            loop {
                interval.tick().await;
                let mut requests = self.requests.lock().await;
                let now = Instant::now();
                requests.retain(|_, entries| {
                    entries.retain(|&t| now.duration_since(t) < self.window);
                    !entries.is_empty()
                });
            }
        });
    }
}
