
import React, { useMemo, Key } from 'react';
import { Input } from "@nextui-org/input";
import { Select, SelectItem } from "@nextui-org/select";
import { CheckSquare, Link2 } from 'lucide-react';
import { EntityType } from '@/utils/odata-helper';

type Selection = "all" | Set<Key>;

interface SelectFieldsProps {
    currentSchema: EntityType | null;
    expandedProperties: any[];
    select: string;
    setSelect: (val: string) => void;
    isDark?: boolean; // 新增
}

export const SelectFields: React.FC<SelectFieldsProps> = ({
    currentSchema,
    expandedProperties,
    select,
    setSelect,
    isDark
}) => {
    const ALL_KEY = '_ALL_';

    const selectItems = useMemo(() => {
        if (!currentSchema) return [];
        const mainProps = currentSchema.properties.map(p => ({ ...p, label: p.name, isExpanded: false }));
        const items = [
            { name: ALL_KEY, type: 'Special', label: '全选 (Select All)', isExpanded: false },
            ...mainProps,
            ...expandedProperties
        ];
        return items;
    }, [currentSchema, expandedProperties]);

    const currentSelectKeys = useMemo(() => {
        const selected = new Set(select ? select.split(',') : []);
        if (currentSchema) {
            const allAvailableKeys = [
                ...currentSchema.properties.map(p => p.name),
                ...expandedProperties.map(p => p.name)
            ];
            const allSelected = allAvailableKeys.length > 0 && allAvailableKeys.every(n => selected.has(n));
            if (allSelected) selected.add(ALL_KEY);
        }
        return selected;
    }, [select, currentSchema, expandedProperties]);

    const handleSelectChange = (keys: Selection) => {
        if (!currentSchema) return;
        const newSet = new Set(keys);
        
        const allAvailableKeys = [
            ...currentSchema.properties.map(p => p.name),
            ...expandedProperties.map(p => p.name)
        ];

        const wasAllSelected = currentSelectKeys.has(ALL_KEY);
        const isAllSelected = newSet.has(ALL_KEY);

        let finalSelection: string[] = [];

        if (isAllSelected && !wasAllSelected) {
            finalSelection = allAvailableKeys;
        } else if (!isAllSelected && wasAllSelected) {
            finalSelection = [];
        } else {
            newSet.delete(ALL_KEY);
            finalSelection = Array.from(new Set(finalSelection)).map(String);
        }

        setSelect(Array.from(new Set(finalSelection)).join(','));
    };

    const commonClassNames = {
        trigger: `h-14 min-h-14 bg-transparent border-small border-default-200 data-[hover=true]:border-success data-[focus=true]:border-success shadow-none`,
        label: `text-[10px] font-medium ${isDark ? 'text-[#5c6370]' : 'text-default-500'}`,
        value: `text-small ${isDark ? 'text-[#98c379]' : 'text-foreground'}`,
        popoverContent: isDark ? 'bg-[#282c34] border border-[#3e4451]' : 'bg-[#D5F5E3] border border-success-200'
    };

    if (!currentSchema) {
        return <Input label="字段 ($select)" placeholder="需先选择实体" isDisabled variant="bordered" classNames={{ inputWrapper: commonClassNames.trigger, label: commonClassNames.label }} />;
    }

    return (
        <Select
            label="字段 ($select)"
            placeholder="选择返回字段"
            selectionMode="multiple"
            selectedKeys={currentSelectKeys}
            onSelectionChange={handleSelectChange}
            variant="bordered"
            color="success" 
            classNames={commonClassNames}
            items={selectItems}
            popoverProps={{ classNames: { content: commonClassNames.popoverContent } }}
            renderValue={(items) => (
                <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                        <span key={item.key} className={`text-xs truncate max-w-[100px] ${isDark ? 'text-[#98c379]' : ''}`}>
                            {item.textValue}{items.length > 1 ? ',' : ''}
                        </span>
                    ))}
                </div>
            )}
        >
            {(item) => {
                if (item.type === 'Special') {
                    return (
                        <SelectItem key={item.name} textValue={item.label} className="font-bold border-b border-divider mb-1">
                            <div className="flex items-center gap-2">
                                <CheckSquare size={14} /> {item.label}
                            </div>
                        </SelectItem>
                    );
                }
                return (
                    <SelectItem key={item.name} value={item.name} textValue={item.name}>
                        <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                {item.isExpanded && <Link2 size={12} className={isDark ? "text-[#56b6c2]" : "text-secondary opacity-70"}/>}
                                <div className="flex flex-col">
                                    <span className={`text-small ${item.isExpanded ? (isDark ? 'text-[#56b6c2]' : 'text-secondary') : ''}`}>{item.name}</span>
                                    <span className="text-tiny text-default-400">{item.type?.split('.').pop()}</span>
                                </div>
                                </div>
                                {item.isExpanded && <span className="text-[10px] text-default-300 ml-2 border border-divider px-1 rounded">Ext</span>}
                        </div>
                    </SelectItem>
                );
            }}
        </Select>
    );
};
