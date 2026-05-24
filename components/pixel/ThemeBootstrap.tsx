// Inline bootstrap: applies the user's saved theme preference (or system
// default) BEFORE the first paint, to avoid a cream/navy flash on dark-mode
// reloads. Stored under localStorage key `wispr-theme`. The actual toggle UI
// lives in ThemeToggle.
const bootstrapScript = `
(function () {
  try {
    var saved = localStorage.getItem("wispr-theme");
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = saved || (systemDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_) {
    // localStorage blocked — fall through to default cream.
  }
})();
`;

export function ThemeBootstrap() {
  return (
    <script
      // The script content is a string constant — no user input — and runs
      // before hydration to prevent a theme flash. dangerouslySetInnerHTML is
      // the documented Next.js path for inline scripts of this kind.
      dangerouslySetInnerHTML={{ __html: bootstrapScript }}
    />
  );
}
