
import React, { useMemo, useState, useEffect } from 'react';
import { Select, SelectItem } from "@nextui-org/select";
import { Chip } from "@nextui-org/chip";
import { Tooltip } from "@nextui-org/tooltip";
import { ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';
import { 
    ALL_STRATEGIES, 
    getGroupedStrategies, 
    isStrategyCompatible,
    MockStrategy
} from './mock-utils';

interface StrategySelectProps {
    value: string;
    onChange: (value: string) => void;
    odataType: string;
    label?: string;
    isDark?: boolean; 
}

interface FlatItem {
    key: string;
    type: 'category' | 'strategy';
    label: string;
    value: string;
    isCompatible: boolean;
    level: number;
    isExpanded?: boolean;
    strategy?: MockStrategy; 
}

export const StrategySelect: React.FC<StrategySelectProps> = ({ value, onChange, odataType, label, isDark }) => {
    const selectedStrategy = useMemo(() => ALL_STRATEGIES.find(s => s.value === value), [value]);

    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
        const defaults = new Set(['Custom (自定义)']);
        if (selectedStrategy) {
            defaults.add(selectedStrategy.category);
        }
        return defaults;
    });

    useEffect(() => {
        if (selectedStrategy && !expandedCategories.has(selectedStrategy.category)) {
            setExpandedCategories(prev => {
                const next = new Set(prev);
                next.add(selectedStrategy.category);
                return next;
            });
        }
    }, [selectedStrategy]); 

    const grouped = useMemo(() => getGroupedStrategies(), []);
    
    const flatItems = useMemo(() => {
        const items: FlatItem[] = [];
        const categories = Object.keys(grouped).sort((a, b) => {
            if (a.startsWith('Custom')) return -1;
            if (b.startsWith('Custom')) return 1;
            return a.localeCompare(b);
        });

        categories.forEach(cat => {
            const isSelectedCategory = selectedStrategy?.category === cat;
            const isExpanded = expandedCategories.has(cat) || isSelectedCategory;

            items.push({
                key: `CAT_${cat}`,
                type: 'category',
                label: cat,
                value: `CAT_${cat}`, 
                isCompatible: true,
                level: 0,
                isExpanded
            });

            if (isExpanded) {
                grouped[cat].forEach(strat => {
                    items.push({
                        key: strat.value,
                        type: 'strategy',
                        label: strat.label,
                        value: strat.value,
                        isCompatible: isStrategyCompatible(strat.value, odataType),
                        level: 1,
                        strategy: strat
                    });
                });
            }
        });

        return items;
    }, [grouped, expandedCategories, odataType, selectedStrategy]);

    const isCurrentCompatible = selectedStrategy ? isStrategyCompatible(value, odataType) : true;

    const selectedKeys = useMemo(() => {
        return selectedStrategy ? new Set([selectedStrategy.value]) : new Set([]);
    }, [selectedStrategy]);

    const toggleCategory = (catName: string) => {
        if (selectedStrategy?.category === catName) return;
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catName)) next.delete(catName);
            else next.add(catName);
            return next;
        });
    };

    const commonClassNames = {
        trigger: `h-8 min-h-8 px-2 bg-transparent border-small border-default-200 data-[hover=true]:border-secondary data-[focus=true]:border-secondary shadow-none`,
        value: `text-[11px] ${!isCurrentCompatible ? 'text-warning-600 font-medium' : ''} ${isDark ? 'text-[#c678dd]' : ''}`,
        popoverContent: isDark ? 'bg-[#282c34] border border-[#3e4451]' : 'bg-[#D5F5E3] border border-success-200'
    };

    return (
        <Select 
            aria-label={label || "Select Strategy"}
            size="sm" 
            variant="bordered"
            color="secondary" 
            selectedKeys={selectedKeys}
            onSelectionChange={(keys) => {
                const k = Array.from(keys)[0] as string;
                if (k && !k.startsWith('CAT_')) onChange(k);
            }}
            selectionMode="single"
            disallowEmptySelection
            classNames={commonClassNames}
            items={flatItems}
            popoverProps={{ classNames: { content: commonClassNames.popoverContent } }}
            renderValue={() => {
                if (!selectedStrategy) return <span>Select...</span>;
                return (
                    <div className="flex items-center gap-1">
                        {!isCurrentCompatible && <AlertTriangle size={12} className="text-warning" />}
                        <span>{selectedStrategy.label}</span>
                    </div>
                );
            }}
        >
            {(item) => {
                if (item.type === 'category') {
                    const isForcedOpen = selectedStrategy?.category === item.label;
                    return (
                        <SelectItem 
                            key={item.key} 
                            textValue={item.label}
                            className={`font-bold sticky top-0 z-10 p-0 rounded-none border-b outline-none ${
                                isDark 
                                ? "text-[#5c6370] bg-[#21252b] border-[#3e4451] data-[hover=true]:bg-[#2c313a]" 
                                : "text-default-600 bg-transparent border-divider/50 data-[hover=true]:bg-black/5"
                            }`}
                            isReadOnly
                        >
                            <div 
                                className={`flex items-center gap-2 w-full h-full py-2 px-3 ${isForcedOpen ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleCategory(item.label);
                                }}
                            >
                                <div className={isDark ? "text-[#5c6370]" : "text-default-400"}>
                                    {item.isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                </div>
                                <span className="text-[11px] uppercase tracking-wider select-none">{item.label}</span>
                                {isForcedOpen && <span className={`text-[9px] ml-auto font-normal lowercase ${isDark ? "text-[#5c6370]" : "text-default-400"}`}>(active)</span>}
                            </div>
                        </SelectItem>
                    );
                }
                
                const tooltipContent = item.strategy?.type === 'faker' 
                    ? `faker.${item.strategy.fakerModule}.${item.strategy.fakerMethod}()`
                    : (item.strategy?.type === 'custom.increment' 
                        ? 'Auto-incrementing number/string (e.g. 1, 2, 3...)'
                        : 'Fixed value logic');

                return (
                    <SelectItem key={item.key} value={item.key} textValue={item.label}>
                         <Tooltip 
                            content={<span className="font-mono text-[10px]">{tooltipContent}</span>} 
                            placement="right" 
                            delay={300}
                            closeDelay={0}
                        >
                            <div className="flex justify-between items-center w-full gap-2 pl-6">
                                <span className={`text-[11px] ${!item.isCompatible ? 'text-default-400 line-through decoration-default-300' : ''}`}>
                                    {item.label}
                                </span>
                                {!item.isCompatible && (
                                    <Chip size="sm" color="warning" variant="flat" className="h-4 text-[9px] px-1 min-w-min">
                                        Type mismatch
                                    </Chip>
                                )}
                            </div>
                        </Tooltip>
                    </SelectItem>
                );
            }}
        </Select>
    );
};
