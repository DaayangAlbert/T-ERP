import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ThemeProvider } from "@/features/theme/ThemeContext";

describe("theme toggle", () => {
  it("switches from light to dark and persists the preference", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Mode sombre" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(document.documentElement).toHaveClass("theme-dark");
    });
    expect(localStorage.getItem("preferredTheme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Mode clair" })).toBeInTheDocument();
  });

  it("restores the stored dark theme on load", async () => {
    localStorage.setItem("preferredTheme", "dark");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
    });
    expect(screen.getByRole("button", { name: "Mode clair" })).toBeInTheDocument();
  });
});
