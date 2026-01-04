
import React, { useMemo, Key } from 'react';
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { Link2 } from 'lucide-react';
import { EntityType } from '@/utils/odata-helper';

export interface SortItem {
    field: string;
    order: 'asc' | 'desc';
}

type Selection = "all" | Set<Key>;

interface SortFieldsProps {
    currentSchema: EntityType | null;
    expandedProperties: any[];
    sortItems: SortItem[];
    setSortItems: (items: SortItem[]) => void;
    isDark?: boolean; // 新增
}

export const SortFields: React.FC<SortFieldsProps> = ({
    currentSchema,
    expandedProperties,
    sortItems,
    setSortItems,
    isDark
}) => {
    const sortOptions = useMemo(() => {
        if (!currentSchema) return [];
        const mainProps = currentSchema.properties.map(p => ({ ...p, label: p.name, isExpanded: false }));
        return [...mainProps, ...expandedProperties];
    }, [currentSchema, expandedProperties, sortItems]);

    const currentAscKeys = useMemo(() => new Set(sortItems.filter(i => i.order === 'asc').map(i => i.field)), [sortItems]);
    const currentDescKeys = useMemo(() => new Set(sortItems.filter(i => i.order === 'desc').map(i => i.field)), [sortItems]);

    const updateSortItems = (newSelectedKeys: Set<React.Key>, type: 'asc' | 'desc') => {
        const otherTypeItems = sortItems.filter(item => item.order !== type);
        const existingKeySet = new Set(sortItems.map(i => i.field));
        
        const newItems: SortItem[] = [];
        newSelectedKeys.forEach(key => {
            const field = String(key);
            if (!existingKeySet.has(field)) {
                newItems.push({ field, order: type });
            }
        });
        
        const nextItems = sortItems.filter(item => {
            if (item.order !== type) return true; 
            return newSelectedKeys.has(item.field); 
        });
        
        nextItems.push(...newItems);
        setSortItems(nextItems);
    };

    const handleAscChange = (keys: Selection) => {
        const selectedSet = keys === "all" 
            ? new Set(sortOptions.filter(o => !currentDescKeys.has(o.name)).map(o => o.name))
            : new Set(keys);
        updateSortItems(selectedSet, 'asc');
    };

    const handleDescChange = (keys: Selection) => {
        const selectedSet = keys === "all"
            ? new Set(sortOptions.filter(o => !currentAscKeys.has(o.name)).map(o => o.name))
            : new Set(keys);
        updateSortItems(selectedSet, 'desc');
    };

    const commonClassNames = {
        trigger: `h-14 min-h-14 bg-transparent border-small border-default-200 data-[hover=true]:border-secondary data-[focus=true]:border-secondary shadow-none`,
        label: `text-[10px] font-medium ${isDark ? 'text-[#5c6370]' : 'text-default-500'}`,
        value: `text-small ${isDark ? 'text-[#c678dd]' : 'text-foreground'}`,
        popoverContent: isDark ? 'bg-[#282c34] border border-[#3e4451]' : 'bg-[#D5F5E3] border border-success-200'
    };

    if (!currentSchema) {
        return (
            <>
                <Input isDisabled label="升序" placeholder="需先选择实体" variant="bordered" classNames={{ inputWrapper: commonClassNames.trigger, label: commonClassNames.label }} />
                <Input isDisabled label="降序" placeholder="需先选择实体" variant="bordered" classNames={{ inputWrapper: commonClassNames.trigger, label: commonClassNames.label }} />
            </>
        );
    }

    return (
        <>
            <Select
                label="升序 (Ascending)"
                placeholder="选择升序字段"
                selectionMode="multiple"
                selectedKeys={currentAscKeys}
                onSelectionChange={handleAscChange}
                disabledKeys={Array.from(currentDescKeys)} 
                variant="bordered"
                color="secondary"
                classNames={commonClassNames}
                items={sortOptions}
                popoverProps={{ classNames: { content: commonClassNames.popoverContent } }}
            >
                {(p) => (
                    <SelectItem key={p.name} value={p.name} textValue={p.name}>
                        <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                {p.isExpanded && <Link2 size={12} className={isDark ? "text-[#56b6c2]" : "text-secondary opacity-70"}/>}
                                <span className={`text-small ${p.isExpanded ? (isDark ? 'text-[#56b6c2]' : 'text-secondary') : ''}`}>{p.name}</span>
                            </div>
                            {currentDescKeys.has(p.name) && <span className="text-[10px] text-danger">已选降序</span>}
                        </div>
                    </SelectItem>
                )}
            </Select>

            <Select
                label="降序 (Descending)"
                placeholder="选择降序字段"
                selectionMode="multiple"
                selectedKeys={currentDescKeys}
                onSelectionChange={handleDescChange}
                disabledKeys={Array.from(currentAscKeys)} 
                variant="bordered"
                color="secondary"
                classNames={commonClassNames}
                items={sortOptions}
                popoverProps={{ classNames: { content: commonClassNames.popoverContent } }}
            >
                {(p) => (
                    <SelectItem key={p.name} value={p.name} textValue={p.name}>
                        <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                {p.isExpanded && <Link2 size={12} className={isDark ? "text-[#56b6c2]" : "text-secondary opacity-70"}/>}
                                <span className={`text-small ${p.isExpanded ? (isDark ? 'text-[#56b6c2]' : 'text-secondary') : ''}`}>{p.name}</span>
                            </div>
                            {currentAscKeys.has(p.name) && <span className="text-[10px] text-primary">已选升序</span>}
                        </div>
                    </SelectItem>
                )}
            </Select>
        </>
    );
};
