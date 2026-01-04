
import React from 'react';
import { Switch } from "@nextui-org/switch";
import { cn } from "@nextui-org/theme";
import { Filter, XCircle } from 'lucide-react';

interface PaginationControlsProps {
    filter: string;
    onOpenFilter: () => void;
    onClearFilter: () => void;
    top: string;
    setTop: (val: string) => void;
    skip: string;
    setSkip: (val: string) => void;
    count: boolean;
    setCount: (val: boolean) => void;
    isDark?: boolean; // 新增
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
    filter, onOpenFilter, onClearFilter,
    top, setTop,
    skip, setSkip,
    count, setCount,
    isDark
}) => {
    return (
        // 使用 bg-transparent, 移除所有 bg 填充
        <div className={`flex items-center rounded-xl px-3 transition-colors h-14 w-full overflow-hidden relative shadow-sm ${
            isDark 
                ? "bg-transparent border border-[#3e4451] hover:bg-[#2c313a]" 
                : "bg-transparent border border-default-200 hover:bg-default-50"
        }`}>
            
            {/* 1. Filter Section (Flex Grow + min-w-0 to prevent overflow) */}
            <div 
                className="flex-1 min-w-0 flex flex-col justify-center h-full cursor-pointer group pr-2 mr-2 relative"
                onClick={onOpenFilter}
            >
                <div className="flex items-center justify-between">
                     <span className={`text-[10px] font-medium transition-colors ${
                         isDark ? "text-[#abb2bf] group-hover:text-[#61afef]" : "text-default-500 group-hover:text-primary"
                     }`}>
                        过滤 ($filter)
                    </span>
                </div>
               
                <div className="flex items-center gap-2 h-6 text-small w-full">
                    {filter ? (
                        <div className="flex items-center gap-1 w-full">
                            <Filter size={14} className={isDark ? "text-[#61afef]" : "text-primary"} />
                            {/* flex-1 + truncate ensures text takes available space but doesn't push others */}
                            <span className={`truncate font-mono text-xs flex-1 ${isDark ? "text-[#98c379]" : "text-foreground"}`} title={filter}>
                                {filter}
                            </span>
                            {/* Clear Button */}
                            <div 
                                role="button"
                                className={`p-1 z-10 shrink-0 ${isDark ? "text-[#5c6370] hover:text-[#e06c75]" : "text-default-400 hover:text-danger"}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearFilter();
                                }}
                            >
                                <XCircle size={14} />
                            </div>
                        </div>
                    ) : (
                        <span className={`text-xs italic truncate transition-colors ${isDark ? "text-[#5c6370] group-hover:text-[#abb2bf]" : "text-default-400 group-hover:text-default-500"}`}>
                            点击构建过滤器...
                        </span>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className={`w-px h-8 shrink-0 mr-3 ${isDark ? "bg-[#3e4451]" : "bg-default-200"}`} />

            {/* 2. Top Section (shrink-0) */}
            <div className="flex flex-col w-12 items-center justify-center h-full mr-1 shrink-0">
                <label htmlFor="input-top" className={`text-[10px] font-medium cursor-text w-full text-center ${isDark ? "text-[#5c6370]" : "text-default-500"}`}>Top</label>
                <input 
                    id="input-top"
                    className={`w-full bg-transparent text-center font-mono text-sm outline-none h-6 transition-colors placeholder:text-default-400 ${
                        isDark ? "text-[#d19a66] focus:text-[#e5c07b]" : "text-default-700 focus:text-primary"
                    }`}
                    value={top || ''} 
                    onChange={(e) => setTop(e.target.value)}
                    placeholder="20"
                />
            </div>

            {/* Divider */}
            <div className={`w-px h-8 shrink-0 mx-2 ${isDark ? "bg-[#3e4451]" : "bg-default-200"}`} />

            {/* 3. Skip Section (shrink-0) */}
            <div className="flex flex-col w-12 items-center justify-center h-full mr-1 shrink-0">
                <label htmlFor="input-skip" className={`text-[10px] font-medium cursor-text w-full text-center ${isDark ? "text-[#5c6370]" : "text-default-500"}`}>Skip</label>
                <input 
                    id="input-skip"
                    className={`w-full bg-transparent text-center font-mono text-sm outline-none h-6 transition-colors placeholder:text-default-400 ${
                        isDark ? "text-[#d19a66] focus:text-[#e5c07b]" : "text-default-700 focus:text-primary"
                    }`}
                    value={skip || ''}
                    onChange={(e) => setSkip(e.target.value)}
                    placeholder="0"
                />
            </div>

            {/* Divider */}
            <div className={`w-px h-8 shrink-0 mx-2 ${isDark ? "bg-[#3e4451]" : "bg-default-200"}`} />

            {/* 4. Count Section (shrink-0) */}
            <div className="flex flex-col items-center justify-center h-full min-w-[50px] shrink-0">
                 <span className={`text-[10px] font-medium mb-1 ${isDark ? "text-[#5c6370]" : "text-default-500"}`}>Count</span>
                 <Switch 
                    size="sm" 
                    isSelected={count} 
                    onValueChange={setCount} 
                    aria-label="Count"
                    color="primary"
                    classNames={{
                        wrapper: `${isDark ? "group-data-[selected=true]:bg-[#98c379]" : "group-data-[selected=true]:bg-primary"} h-5`,
                        thumb: cn("w-3 h-3 group-data-[selected=true]:ml-3")
                    }}
                />
            </div>
        </div>
    );
};
