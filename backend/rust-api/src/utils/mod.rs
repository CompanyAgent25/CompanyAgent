use slug::slugify;

pub fn generate_slug(name: &str) -> String {
    slugify(name)
}

pub fn sanitize_input(input: &str) -> String {
    input
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
        .trim()
        .to_string()
}
