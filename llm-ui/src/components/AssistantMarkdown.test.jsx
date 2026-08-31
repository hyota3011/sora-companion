import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AssistantMarkdown from "./AssistantMarkdown.jsx";

describe("AssistantMarkdown", () => {
    it("replaces Markdown image syntaxes with inert blocked notices", () => {
        const { container } = render(<AssistantMarkdown text={"![Remote image](https://tracker.example/pixel.png)\n\n![Reference image][image]\n\n[image]: https://tracker.example/reference.png"} />);

        expect(screen.getAllByText(/Image blocked/)).toHaveLength(2);
        expect(container.querySelector("img")).toBeNull();
    });

    it("does not render raw HTML images", () => {
        const { container } = render(<AssistantMarkdown text={'<img src="https://tracker.example/pixel.png" alt="hidden">'} />);

        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("a")).toBeNull();
    });

    it("permits only absolute HTTP(S) links with private navigation attributes", () => {
        const { container } = render(<AssistantMarkdown text="[safe](https://example.com/path) [script](javascript:alert(1)) [relative](/relative) [data](data:text/plain,hello)" />);

        const safeLink = screen.getByRole("link", { name: "safe" });
        expect(safeLink).toHaveAttribute("href", "https://example.com/path");
        expect(safeLink).toHaveAttribute("target", "_blank");
        expect(safeLink).toHaveAttribute("rel", "noopener noreferrer");
        expect(safeLink).toHaveAttribute("referrerpolicy", "no-referrer");
        expect(container.querySelectorAll("a")).toHaveLength(1);
    });
});
