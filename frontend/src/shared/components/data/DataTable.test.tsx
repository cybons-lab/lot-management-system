import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type Column } from "./DataTable";

type TestData = {
  id: string;
  name: string;
  category: string;
};

const columns: Column<TestData>[] = [
  {
    id: "id",
    header: "ID",
    accessor: (row) => row.id as never,
    width: "50px",
  },
  {
    id: "name",
    header: "Name",
    accessor: (row) => row.name as never,
    sortable: true,
    width: "200px",
  },
  {
    id: "category",
    header: "Category",
    cell: (row) => <span>{row.category}</span>,
  },
];

const data: TestData[] = [
  { id: "1", name: "Item A", category: "Cat 1" },
  { id: "2", name: "Item B", category: "Cat 2" },
];

describe("DataTable", () => {
  it("renders table headers and data", () => {
    render(<DataTable data={data} columns={columns} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Cat 1")).toBeInTheDocument();
  });

  it("handles sorting", () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        data={data}
        columns={columns}
        sort={{ column: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );

    fireEvent.click(screen.getByText("Name"));
    expect(onSortChange).toHaveBeenCalledWith({ column: "name", direction: "desc" });
  });

  it("handles row selection", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        data={data}
        columns={columns}
        selectable
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    );

    // Select all checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Header checkbox
    expect(onSelectionChange).toHaveBeenCalledWith(["1", "2"]);
  });

  it("renders resize handles", () => {
    const { container } = render(<DataTable data={data} columns={columns} />);
    const resizers = container.querySelectorAll(".cursor-col-resize");
    expect(resizers.length).toBeGreaterThan(0);
  });
});
