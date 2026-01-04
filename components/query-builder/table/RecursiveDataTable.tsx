
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { 
    ChevronUp, ChevronDown, GripVertical
} from 'lucide-react';
import { 
    useReactTable, 
    getCoreRowModel, 
    getSortedRowModel, 
    getExpandedRowModel,
    flexRender, 
    SortingState,
    ColumnOrderState,
    RowSelectionState,
    ExpandedState
} from '@tanstack/react-table';

import { isExpandableData, updateRecursiveSelection } from './utils';
import { exportToExcel } from './excel-export';
import { ExpandedRowView } from './ExpandedRowView';
import { ParsedSchema } from '@/utils/odata-helper';
import { TableHeader } from './TableHeader';
import { useTableColumns } from './useTableColumns';
import { useToast } from '@/components/ui/ToastContext';
import { TableContext, TableContextType, GetUpdatesFn, UpdateResult, useTableContext } from './TableContext';

interface RecursiveDataTableProps {
    data: any[];
    isDark: boolean;
    isRoot?: boolean; 
    onDelete?: (selectedRows: any[]) => void; 
    onUpdate?: (updates: { item: any, changes: any }[]) => void;
    onCreate?: (selectedRows: any[]) => void;
    onExport?: () => void;
    loading?: boolean;
    parentSelected?: boolean; 
    entityName?: string;
    schema?: ParsedSchema | null;
    enableEdit?: boolean;
    enableDelete?: boolean;
    hideUpdateButton?: boolean;
    onDraftChange?: (draft: Record<number, Record<string, any>>) => void;
    externalIsEditing?: boolean;
}

export const RecursiveDataTable: React.FC<RecursiveDataTableProps> = ({ 
    data, 
    isDark, 
    isRoot = false, 
    onDelete, 
    onUpdate,
    onCreate,
    onExport, 
    loading = false,
    parentSelected = false,
    entityName = 'Main',
    schema,
    enableEdit = true,
    enableDelete = true,
    hideUpdateButton = false,
    onDraftChange,
    externalIsEditing
}) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(() => {
        if (typeof window !== 'undefined') return Math.max(600, window.innerWidth - 100);
        return 1000;
    });

    const toast = useToast();

    // --- Table State ---
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({}); 
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [draggingColumn, setDraggingColumn] = useState<string | null>(null);

    // --- Editing State ---
    const [isEditing, setIsEditing] = useState(false);
    const [editDraft, setEditDraft] = useState<Record<number, Record<string, any>>>({});

    const parentContext = useTableContext();
    const tableId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
    const registryRef = useRef<Map<string, GetUpdatesFn>>(new Map());

    // --- Effects ---
    useEffect(() => {
        const newSelection: RowSelectionState = {};
        data.forEach((row, index) => {
            if (row['__selected'] === true) {
                newSelection[index] = true;
            }
        });
        setRowSelection(newSelection);
        
        if (externalIsEditing === undefined) {
            setEditDraft({});
            onDraftChange?.({});
            setIsEditing(false);
        }
    }, [data, parentSelected, externalIsEditing]);

    useEffect(() => {
        if (externalIsEditing !== undefined) {
            setIsEditing(externalIsEditing);
            if (!externalIsEditing) {
                setEditDraft({});
                onDraftChange?.({});
            }
        }
    }, [externalIsEditing]);

    useEffect(() => {
        if (!tableContainerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(tableContainerRef.current);
        return () => observer.disconnect();
    }, []);

    // --- Schema Analysis ---
    const { pkSet, fkSet, fkInfoMap, schemaProperties, navPropSet } = useMemo(() => {
        const pkSet = new Set<string>();
        const fkSet = new Set<string>();
        const navPropSet = new Set<string>();
        const fkInfoMap = new Map<string, string>(); 
        const schemaProperties: Record<string, any> = {};

        if (schema && entityName && schema.entities) {
            let entityType = schema.entities.find(e => e.name === entityName);
            if (!entityType) {
                const es = schema.entitySets.find(s => s.name === entityName);
                if (es) {
                    const typeName = es.entityType.split('.').pop();
                    entityType = schema.entities.find(e => e.name === typeName);
                }
            }
            if (!entityType) {
                 entityType = schema.entities.find(e => entityName.startsWith(e.name));
            }

            if (entityType) {
                entityType.keys.forEach(k => pkSet.add(k));
                entityType.properties.forEach(p => {
                    schemaProperties[p.name] = p;
                });
                entityType.navigationProperties.forEach(nav => {
                    navPropSet.add(nav.name);
                    if (nav.constraints) {
                        nav.constraints.forEach(c => {
                            fkSet.add(c.sourceProperty);
                            let target = nav.targetType || "Entity";
                            if (target.startsWith('Collection(')) target = target.slice(11, -1);
                            target = target.split('.').pop() || target;
                            fkInfoMap.set(c.sourceProperty, target);
                        });
                    }
                });
            }
        }
        return { pkSet, fkSet, fkInfoMap, schemaProperties, navPropSet };
    }, [schema, entityName]);

    // --- Helper: Get Local Updates ---
    const getLocalUpdates = useCallback((): UpdateResult[] => {
        const updates: UpdateResult[] = [];
        const changedIndices = Object.keys(editDraft).map(Number);
        
        changedIndices.forEach(idx => {
            const isSelected = rowSelection[idx] === true || rowSelection[String(idx)] === true;

            if (isSelected) {
                const originalItem = data[idx];
                const changes = editDraft[idx];
                
                const realChanges: any = {};
                let hasChanges = false;
                Object.entries(changes).forEach(([key, newVal]) => {
                    if (originalItem[key] != newVal) {
                        realChanges[key] = newVal;
                        hasChanges = true;
                    }
                });

                if (hasChanges) {
                    updates.push({ item: originalItem, changes: realChanges });
                }
            }
        });
        return updates;
    }, [editDraft, rowSelection, data]);

    useEffect(() => {
        if (!isRoot && parentContext) {
            parentContext.register(tableId, getLocalUpdates);
            return () => parentContext.unregister(tableId);
        }
    }, [isRoot, parentContext, tableId, getLocalUpdates]);

    // --- Handlers ---
    const handleStartEdit = () => setIsEditing(true);
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditDraft({});
        onDraftChange?.({});
    };

    const handleConfirmUpdate = () => {
        if (!onUpdate) return;
        const allUpdates: UpdateResult[] = [...getLocalUpdates()];
        if (isRoot) {
            registryRef.current.forEach(getUpdatesFn => {
                allUpdates.push(...getUpdatesFn());
            });
        }
        if (allUpdates.length === 0) {
             const hasDrafts = Object.keys(editDraft).length > 0; 
             if (hasDrafts) {
                 toast.warning("检测到修改，但未选中对应行。\n请勾选修改过的行再点击更新。");
             } else {
                 toast.info("未检测到任何实质性修改");
             }
             return;
        }
        onUpdate(allUpdates);
    };

    const handleInputChange = (rowIndex: number, columnId: string, value: any) => {
        setEditDraft(prev => {
            const next = {
                ...prev,
                [rowIndex]: {
                    ...(prev[rowIndex] || {}),
                    [columnId]: value
                }
            };
            if (onDraftChange) onDraftChange(next);
            return next;
        });
        
        if (!rowSelection[rowIndex] && !rowSelection[String(rowIndex)]) {
            setRowSelection(prev => ({ ...prev, [rowIndex]: true }));
            updateRecursiveSelection(data[rowIndex], true);
        }
    };

    const columns = useTableColumns({
        data,
        containerWidth,
        pkSet,
        fkSet,
        fkInfoMap,
        navPropSet
    });

    useEffect(() => {
        if (columns.length > 0) {
            setColumnOrder(prev => columns.map(c => c.id as string));
        }
    }, [columns]); 

    const safeColumnOrder = useMemo(() => {
        const validIds = new Set(columns.map(c => c.id));
        return columnOrder.filter(id => validIds.has(id));
    }, [columnOrder, columns]);

    const table = useReactTable({
        data,
        columns,
        meta: {
            editDraft,
            handleInputChange,
            isEditing,
            schemaProperties,
            pkSet
        },
        state: { 
            sorting, 
            columnOrder: safeColumnOrder,
            rowSelection, 
            expanded 
        },
        enableRowSelection: true, 
        enableExpanding: true,
        getRowCanExpand: row => {
            const keys = Object.keys(row.original);
            return keys.some(k => k !== '__metadata' && k !== '__selected' && isExpandableData(row.original[k]));
        },
        onExpandedChange: setExpanded,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnOrderChange: setColumnOrder,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
    });

    const handleExport = () => exportToExcel(data, entityName, toast);
    const handleDeleteClick = () => {
        const selectedRows = data.filter(r => r['__selected'] === true);
        if (onDelete) onDelete(selectedRows);
    };
    const handleCreateClick = () => {
        const selectedRowsWithEdits: any[] = [];
        data.forEach((row, idx) => {
            if (row['__selected'] === true) {
                const draft = editDraft[idx];
                selectedRowsWithEdits.push(draft ? { ...row, ...draft } : row);
            }
        });
        if (onCreate) onCreate(selectedRowsWithEdits);
    };

    const contextValue: TableContextType = useMemo(() => ({
        register: (id, getUpdates) => { registryRef.current.set(id, getUpdates); },
        unregister: (id) => { registryRef.current.delete(id); }
    }), []);

    // --- Row Style Logic ---
    const getRowStyle = (index: number, isSelected: boolean) => {
        
        const borderColors = [
            'border-[#98c379]', // Green
            'border-[#61afef]', // Blue
            'border-[#c678dd]', // Purple
            'border-[#56b6c2]', // Cyan
        ];
        
        const borderColor = borderColors[index % 4];

        if (isSelected) {
            // Selected: Transparent BG, but Orange Border to highlight
            return `bg-default-100/30 text-default-foreground font-semibold border-l-4 border-[#d19a66]`;
        }
        
        // Normal: Transparent BG, Colored Left Border
        return `bg-transparent text-default-foreground border-l-4 ${borderColor} hover:bg-default-100/20 transition-colors`;
    };

    const tableContent = (
        <div className="flex flex-col h-full w-full gap-2 p-3 rounded-medium shadow-none overflow-hidden relative bg-transparent">
            <TableHeader 
                isRoot={isRoot}
                isEditing={isEditing}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onConfirmUpdate={handleConfirmUpdate}
                onDelete={handleDeleteClick}
                onExport={handleExport}
                onCreate={onCreate ? handleCreateClick : undefined}
                enableEdit={enableEdit}
                enableDelete={enableDelete}
                hideUpdateButton={hideUpdateButton}
            />

            <div className={`flex-1 w-full overflow-auto relative rounded-xl border scrollbar-thin scrollbar-thumb-default-300 ${isDark ? 'border-[#3e4451]' : 'border-divider'}`} ref={tableContainerRef}>
                <table 
                    className="min-w-full table-fixed border-separate border-spacing-y-3 px-2" // 增加行间距，实现卡片悬浮感
                    style={{ width: Math.max(table.getTotalSize(), containerWidth - 24) }}
                >
                    <thead className="sticky top-0 z-20 shadow-sm [&>tr]:first:rounded-xl">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="h-10">
                                {headerGroup.headers.map((header, index) => (
                                    <th 
                                        key={header.id} 
                                        className={`
                                            backdrop-blur-md text-tiny font-bold uppercase px-4 py-3 text-left
                                            ${isDark ? 'bg-[#282c34]/90 text-[#5c6370]' : 'bg-[#D5F5E3]/90 text-default-500'}
                                            ${index === 0 ? 'rounded-l-xl' : ''}
                                            ${index === headerGroup.headers.length - 1 ? 'rounded-r-xl' : ''}
                                            relative group select-none whitespace-nowrap overflow-hidden
                                        `}
                                        style={{ width: header.getSize() }}
                                        draggable={!header.isPlaceholder && !['expander', 'select', 'index'].includes(header.id)}
                                        onDragStart={(e) => {
                                            if (['expander', 'select', 'index'].includes(header.id)) return;
                                            setDraggingColumn(header.column.id);
                                            e.dataTransfer.effectAllowed = 'move';
                                            e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                            setDraggingColumn(null);
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (draggingColumn && draggingColumn !== header.column.id && !['expander', 'select', 'index'].includes(header.id)) {
                                                const newOrder = [...columnOrder];
                                                const dragIndex = newOrder.indexOf(draggingColumn);
                                                const dropIndex = newOrder.indexOf(header.column.id);
                                                if (dragIndex !== -1 && dropIndex !== -1) {
                                                    newOrder.splice(dragIndex, 1);
                                                    newOrder.splice(dropIndex, 0, draggingColumn);
                                                    setColumnOrder(newOrder);
                                                }
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-1 w-full justify-between">
                                            {/* Grip for Draggable columns */}
                                            {!['expander', 'select', 'index'].includes(header.id) && (
                                                <GripVertical size={12} className={`cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0 absolute left-1 ${isDark ? 'text-[#5c6370]' : 'text-default-300'}`} />
                                            )}
                                            
                                            {/* Header Content */}
                                            <div 
                                                className={`flex-1 flex items-center gap-1 overflow-hidden ${!['expander', 'select', 'index'].includes(header.id) ? 'pl-3' : 'justify-center'}`}
                                                onClick={header.column.getToggleSortingHandler()}
                                                style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                                            >
                                                <span className="truncate flex-1">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </span>
                                                {{
                                                    asc: <ChevronUp size={12} className={isDark ? "text-[#61afef] shrink-0" : "text-primary shrink-0"} />,
                                                    desc: <ChevronDown size={12} className={isDark ? "text-[#61afef] shrink-0" : "text-primary shrink-0"} />,
                                                }[header.column.getIsSorted() as string] ?? null}
                                            </div>
                                        </div>

                                        {/* Resize Handle */}
                                        {header.column.getCanResize() && (
                                            <div
                                                onMouseDown={header.getResizeHandler()}
                                                onTouchStart={header.getResizeHandler()}
                                                className={`absolute right-0 top-1/4 h-1/2 w-1 cursor-col-resize touch-none select-none rounded transition-colors z-30 ${
                                                    header.column.getIsResizing() 
                                                    ? (isDark ? 'bg-[#61afef]' : 'bg-primary') 
                                                    : (isDark ? 'bg-[#5c6370]/50 hover:bg-[#61afef]/50' : 'bg-default-300/50 hover:bg-primary/50')
                                                }`}
                                            />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="bg-transparent">
                        
                        {table.getRowModel().rows.map((row, idx) => {
                            const isSelected = row.getIsSelected();
                            const rowStyleClass = getRowStyle(idx, isSelected);

                            return (
                                <React.Fragment key={row.id}>
                                    <tr 
                                        className={`
                                            group outline-none transition-all duration-200 ease-in-out
                                            ${rowStyleClass}
                                            ${row.getIsExpanded() ? 'shadow-inner rounded-b-none mb-0' : 'shadow-sm hover:shadow-md'}
                                        `}
                                        data-selected={isSelected}
                                    >
                                        {row.getVisibleCells().map((cell, cellIdx) => {
                                            const isFirst = cellIdx === 0;
                                            const isLast = cellIdx === row.getVisibleCells().length - 1;
                                            return (
                                                <td 
                                                    key={cell.id} 
                                                    className={`
                                                        p-3 text-small align-middle
                                                        whitespace-nowrap overflow-hidden text-ellipsis
                                                        ${cell.column.id === 'select' ? 'text-center' : ''}
                                                        ${isFirst ? 'rounded-l-xl' : ''}
                                                        ${isLast ? 'rounded-r-xl' : ''}
                                                        ${row.getIsExpanded() ? 'rounded-b-none' : ''}
                                                    `}
                                                    style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {row.getIsExpanded() && (
                                        <tr className="bg-transparent">
                                            <td colSpan={row.getVisibleCells().length} className="p-0 rounded-b-xl overflow-hidden shadow-sm">
                                                <div className={`ml-4 rounded-b-xl overflow-hidden border-l-4 ${isSelected ? 'border-[#d19a66] bg-transparent' : (isDark ? 'border-[#5c6370] bg-transparent' : 'border-default-300 bg-transparent')}`}>
                                                    <ExpandedRowView 
                                                        rowData={row.original} 
                                                        isDark={isDark} 
                                                        parentSelected={row.getIsSelected()} 
                                                        schema={schema} 
                                                        parentEntityName={entityName}
                                                        onUpdate={onUpdate}
                                                        isEditing={isEditing}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                
                {data.length === 0 && !loading && (
                    <div className={`flex flex-col items-center justify-center h-40 ${isDark ? "text-[#5c6370]" : "text-default-400"}`}>
                        <p className="text-small">暂无数据 (No Data)</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (isRoot) {
        return (
            <TableContext.Provider value={contextValue}>
                {tableContent}
            </TableContext.Provider>
        );
    }

    return tableContent;
};
