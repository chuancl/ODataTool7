
import React, { useState, useMemo, useEffect, Key } from 'react';
import { Select, SelectItem } from "@nextui-org/select";
import { ChevronRight, ChevronDown } from 'lucide-react';
import { EntityType, ParsedSchema } from '@/utils/odata-helper';

type Selection = "all" | Set<Key>;

interface ExpandSelectProps {
    currentSchema: EntityType | null;
    schema: ParsedSchema | null;
    expand: string;
    setExpand: (val: string) => void;
    isDark?: boolean; // 新增
}

export const ExpandSelect: React.FC<ExpandSelectProps> = ({
    currentSchema,
    schema,
    expand,
    setExpand,
    isDark
}) => {
    const [treeExpandedKeys, setTreeExpandedKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        setTreeExpandedKeys(new Set());
    }, [currentSchema?.name]);

    const toggleTreeExpand = (path: string) => {
        setTreeExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const expandItems = useMemo(() => {
        if (!currentSchema || !schema) return [];

        const buildRecursive = (entity: EntityType, parentPath: string, level: number, ancestors: string[]): any[] => {
            const navs = entity.navigationProperties;
            if (!navs || navs.length === 0) return [];
            
            let result: any[] = [];
            const sortedNavs = [...navs].sort((a, b) => a.name.localeCompare(b.name));

            for (const nav of sortedNavs) {
                let targetTypeName = nav.targetType;
                if (targetTypeName?.startsWith('Collection(')) {
                    targetTypeName = targetTypeName.slice(11, -1);
                }
                targetTypeName = targetTypeName?.split('.').pop() || "";

                if (ancestors.includes(targetTypeName)) {
                    continue; 
                }

                const currentPath = parentPath ? `${parentPath}/${nav.name}` : nav.name;
                const nextEntity = schema.entities.find(e => e.name === targetTypeName);
                
                let hasChildren = false;
                if (nextEntity && level < 10) {
                     const nextAncestors = [...ancestors, targetTypeName];
                     hasChildren = nextEntity.navigationProperties.some(n => {
                        let t = n.targetType;
                        if (t?.startsWith('Collection(')) t = t.slice(11, -1);
                        t = t?.split('.').pop() || "";
                        return !nextAncestors.includes(t);
                     });
                }
                
                const isTreeExpanded = treeExpandedKeys.has(currentPath);

                result.push({
                    name: currentPath,
                    label: nav.name,
                    fullPath: currentPath,
                    type: 'nav',
                    targetType: nav.targetType,
                    level: level,
                    hasChildren,
                    isTreeExpanded
                });

                if (hasChildren && isTreeExpanded && nextEntity) {
                     const nextAncestors = [...ancestors, targetTypeName];
                     const children = buildRecursive(nextEntity, currentPath, level + 1, nextAncestors);
                     result.push(...children);
                }
            }
            return result;
        };

        const items = buildRecursive(currentSchema, "", 0, [currentSchema.name]);

        if (items.length === 0) {
            return [{ name: 'none', label: '无关联实体', type: 'placeholder', targetType: undefined, level: 0 }];
        }

        return items;
    }, [currentSchema, schema, treeExpandedKeys]);

    const currentExpandKeys = useMemo(() => {
        return new Set(expand ? expand.split(',') : []);
    }, [expand]);

    const handleExpandChange = (keys: Selection) => {
        const newSet = new Set(keys);
        if (newSet.has('none')) newSet.delete('none');
        setExpand(Array.from(newSet).join(','));
    };

    const commonClassNames = {
        trigger: `h-14 min-h-14 bg-transparent border-small border-default-200 data-[hover=true]:border-warning data-[focus=true]:border-warning shadow-none`,
        label: `text-[10px] font-medium ${isDark ? 'text-[#5c6370]' : 'text-default-500'}`,
        value: `text-small ${isDark ? 'text-[#e5c07b]' : 'text-foreground'}`,
        popoverContent: isDark ? 'bg-[#282c34] border border-[#3e4451]' : 'bg-[#D5F5E3] border border-success-200'
    };

    if (!currentSchema) {
        return <Select isDisabled label="展开 ($expand)" placeholder="需先选择实体" variant="bordered" classNames={commonClassNames}><SelectItem key="placeholder">Placeholder</SelectItem></Select>;
    }

    return (
        <Select
            label="展开 ($expand)"
            placeholder="选择关联实体"
            selectionMode="multiple"
            selectedKeys={currentExpandKeys}
            onSelectionChange={handleExpandChange}
            variant="bordered"
            color="warning" 
            classNames={commonClassNames}
            items={expandItems}
            popoverProps={{ classNames: { content: commonClassNames.popoverContent } }}
        >
            {(item) => {
                if (item.type === 'placeholder') {
                    return <SelectItem key="none" isReadOnly>无关联实体</SelectItem>;
                }
                const indent = item.level > 0 ? `${item.level * 20}px` : '0px';
                return (
                    <SelectItem key={item.name} value={item.name} textValue={item.name}>
                        <div className="flex flex-col" style={{ paddingLeft: indent }}>
                            <div className="flex items-center gap-1">
                                {item.hasChildren ? (
                                    <div 
                                        role="button"
                                        className={`p-0.5 rounded cursor-pointer z-50 flex items-center justify-center transition-colors ${
                                            isDark ? "text-[#5c6370] hover:text-[#abb2bf] hover:bg-[#3e4451]" : "hover:bg-default-200 text-default-500"
                                        }`}
                                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onPointerUp={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            toggleTreeExpand(item.fullPath);
                                        }}
                                    >
                                        {item.isTreeExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                    </div>
                                ) : (
                                    <div className="w-[18px]" />
                                )}

                                <div className="flex flex-col">
                                    <span className={`text-small ${isDark && currentExpandKeys.has(item.name) ? 'text-[#e5c07b]' : ''}`}>{item.label}</span>
                                    {item.targetType && (
                                        <span className={`text-[9px] ${isDark ? "text-[#5c6370]" : "text-default-400"}`}>
                                            To: {item.targetType?.split('.').pop()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SelectItem>
                );
            }}
        </Select>
    );
};
