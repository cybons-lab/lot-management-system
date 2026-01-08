import { type ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TanstackTable } from "./TanstackTable";

type TestData = {
  id: string;
  name: string;
};

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: "id",
    header: "ID",
    size: 50,
  },
  {
    accessorKey: "name",
    header: "Name",
    size: 200,
  },
];

const data: TestData[] = [
  { id: "1", name: "Test Item 1" },
  { id: "2", name: "Test Item 2" },
];

describe("TanstackTable", () => {
  it("renders table headers and data", () => {
    render(<TanstackTable data={data} columns={columns} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Test Item 1")).toBeInTheDocument();

    // Verify resize handles are present
    // We look for the div with cursor-col-resize class
    // Since we can't easily query by class in testing-library without configuring custom queries,
    // we can use container query or check if style width is applied.

    // Check if styles are applied
    const idHeader = screen.getByText("ID").closest("th");
    expect(idHeader).toHaveStyle({ width: "50px" });

    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader).toHaveStyle({ width: "200px" });
  });

  it("renders resize handles", () => {
    const Result = render(<TanstackTable data={data} columns={columns} />);
    const resizers = Result.container.querySelectorAll(".cursor-col-resize");
    expect(resizers.length).toBeGreaterThan(0);
  });
});
