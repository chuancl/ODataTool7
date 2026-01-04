
import React, { useMemo, useState, Key } from 'react';
import { Select, SelectItem } from "@nextui-org/select";
import { EntityType, ParsedSchema } from '@/utils/odata-helper';
import { FilterBuilderModal } from './FilterBuilderModal';

// 引入拆分的子组件
import { ExpandSelect } from './params/ExpandSelect';
import { SelectFields } from './params/SelectFields';
import { SortFields, SortItem } from './params/SortFields';
import { PaginationControls } from './params/PaginationControls';

// 重新导出 SortItem 以保持兼容性
export type { SortItem };

type Selection = "all" | Set<Key>;

interface ParamsFormProps {
    entitySets: string[];
    selectedEntity: string;
    onEntityChange: (keys: Selection) => void;
    
    filter: string; setFilter: (val: string) => void;
    select: string; setSelect: (val: string) => void;
    expand: string; setExpand: (val: string) => void;
    
    // Sort props
    sortItems: SortItem[];
    setSortItems: (items: SortItem[]) => void;

    top: string; setTop: (val: string) => void;
    skip: string; setSkip: (val: string) => void;
    count: boolean; setCount: (val: boolean) => void;

    currentSchema: EntityType | null;
    schema: ParsedSchema | null;
    isDark?: boolean; // 新增
}

export const ParamsForm: React.FC<ParamsFormProps> = ({
    entitySets, selectedEntity, onEntityChange,
    filter, setFilter,
    select, setSelect,
    expand, setExpand,
    sortItems, setSortItems,
    top, setTop,
    skip, setSkip,
    count, setCount,
    currentSchema,
    schema,
    isDark
}) => {
    // State for Filter Builder Modal
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // --- Helper: 解析 Expand 路径获取对应实体的属性 (用于 Select 和 Sort 候选项) ---
    const expandedEntityProperties = useMemo(() => {
        if (!currentSchema || !schema || !expand) return [];
        
        const paths = expand.split(',').filter(p => p && p !== 'none');
        const extraProps: any[] = [];

        paths.forEach(path => {
            let current = currentSchema;
            const segments = path.split('/');
            let isValidPath = true;

            for (const segment of segments) {
                const nav = current.navigationProperties.find(n => n.name === segment);
                if (!nav) {
                    isValidPath = false;
                    break;
                }
                
                let targetTypeName = nav.targetType;
                if (targetTypeName?.startsWith('Collection(')) {
                    targetTypeName = targetTypeName.slice(11, -1);
                }
                targetTypeName = targetTypeName?.split('.').pop() || "";
                
                const nextEntity = schema.entities.find(e => e.name === targetTypeName);
                if (!nextEntity) {
                    isValidPath = false;
                    break;
                }
                current = nextEntity;
            }

            if (isValidPath && current) {
                extraProps.push(
                    ...current.properties.map(p => ({
                        ...p,
                        name: `${path}/${p.name}`,
                        label: `${path}/${p.name}`,
                        originalName: p.name,
                        sourcePath: path,
                        type: p.type,
                        isExpanded: true
                    }))
                );
            }
        });
        
        return extraProps;
    }, [expand, currentSchema, schema]);

    // Transparent styles for triggers, colored backgrounds for popovers
    const selectClassNames = {
        trigger: `h-14 min-h-14 bg-transparent border-small border-default-200 data-[hover=true]:border-primary data-[focus=true]:border-primary shadow-none`, 
        label: `text-[10px] font-medium ${isDark ? 'text-[#5c6370]' : 'text-default-500'}`,
        value: `text-small font-bold ${isDark ? 'text-[#61afef]' : 'text-foreground'}`,
        popoverContent: isDark ? 'bg-[#282c34] border border-[#3e4451]' : 'bg-[#D5F5E3] border border-success-200'
    };

    return (
        <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl border shrink-0 bg-transparent ${isDark ? 'border-[#3e4451]' : 'border-divider'}`}>
            <FilterBuilderModal 
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                currentFilter={filter}
                onApply={setFilter}
                currentSchema={currentSchema}
                expandedProperties={expandedEntityProperties} 
            />

            {/* --- 左侧控制面板 (实体, 过滤, 分页) [col-span-3] --- */}
            <div className="md:col-span-3 flex flex-col gap-4">
                <Select
                    label="实体集 (Entity Set)"
                    placeholder="选择实体"
                    selectedKeys={selectedEntity ? [selectedEntity] : []}
                    onSelectionChange={onEntityChange}
                    variant="bordered"
                    color="primary"
                    className="w-full"
                    classNames={selectClassNames}
                    items={entitySets.map(e => ({ key: e, label: e }))}
                    popoverProps={{ classNames: { content: selectClassNames.popoverContent } }}
                >
                    {(item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>}
                </Select>

                <PaginationControls 
                    filter={filter}
                    onOpenFilter={() => setIsFilterModalOpen(true)}
                    onClearFilter={() => setFilter('')}
                    top={top} setTop={setTop}
                    skip={skip} setSkip={setSkip}
                    count={count} setCount={setCount}
                    isDark={isDark}
                />
            </div>

            {/* --- 右侧配置面板 (排序, 字段, 展开) [col-span-9] --- */}
            <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 h-full content-start">
                
                <SortFields 
                    currentSchema={currentSchema}
                    expandedProperties={expandedEntityProperties}
                    sortItems={sortItems}
                    setSortItems={setSortItems}
                    isDark={isDark}
                />

                <SelectFields 
                    currentSchema={currentSchema}
                    expandedProperties={expandedEntityProperties}
                    select={select}
                    setSelect={setSelect}
                    isDark={isDark}
                />

                <ExpandSelect 
                    currentSchema={currentSchema}
                    schema={schema}
                    expand={expand}
                    setExpand={setExpand}
                    isDark={isDark}
                />
            </div>
        </div>
    );
};
