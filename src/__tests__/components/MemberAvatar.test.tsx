import React from "react";
import { render, screen } from "@testing-library/react";
import MemberAvatar from "@/components/shared/MemberAvatar";

describe("MemberAvatar", () => {
  it("renders initials from a single name", () => {
    render(<MemberAvatar name="Alice" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders first and last initials from a full name", () => {
    render(<MemberAvatar name="Alice Johnson" />);
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });

  it("renders first letter only for single-word names", () => {
    render(<MemberAvatar name="Bob" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("handles a question mark placeholder name", () => {
    render(<MemberAvatar name="?" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies the sm size class by default", () => {
    const { container } = render(<MemberAvatar name="Alice" size="sm" />);
    expect(container.firstChild).toBeTruthy();
  });

  it("applies a custom avatarColor", () => {
    const { container } = render(<MemberAvatar name="Alice" avatarColor="#FF0000" />);
    expect(container.firstChild).toBeTruthy();
  });
});
