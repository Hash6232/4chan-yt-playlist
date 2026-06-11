export function getThemeColors() {
    const reply = document.querySelector(".reply");
    if (!reply) return [];
    const { backgroundColor, borderBottomColor } = getComputedStyle(reply);
    return [backgroundColor, borderBottomColor];
}
