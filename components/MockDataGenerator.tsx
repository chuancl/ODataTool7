
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Card, CardBody } from "@nextui-org/card";
import { Select, SelectItem } from "@nextui-org/select";
import { ScrollShadow } from "@nextui-org/scroll-shadow";
import { ODataVersion, ParsedSchema } from '@/utils/odata-helper';
import { Sparkles, Settings2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useEntityActions } from './query-builder/hooks/useEntityActions';
import { CodeModal } from './query-builder/CodeModal';
import { ResultTabs } from './query-builder/ResultTabs';
import { StrategySelect } from './mock-data/StrategySelect';
import { useToast } from '@/components/ui/ToastContext';
import { 
    flattenEntityProperties, 
    suggestStrategy, 
    generateValue, 
    isStrategyCompatible,
    MockFieldConfig,
    AutoIncrementConfig
} from './mock-data/mock-utils';

interface Props {
  url: string;
  version: ODataVersion;
  schema: ParsedSchema | null;
  isDark?: boolean;
}

const MockDataGenerator: React.FC<Props> = ({ url, version, schema, isDark = true }) => {
  const [count, setCount] = useState('5');
  const [entitySets, setEntitySets] = useState<string[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  
  const [flatProperties, setFlatProperties] = useState<{ path: string, property: any }[]>([]);
  const [configs, setConfigs] = useState<Record<string, MockFieldConfig>>({});
  const [mockData, setMockData] = useState<any[]>([]);
  const [currentDraft, setCurrentDraft] = useState<Record<number, Record<string, any>>>({});

  const toast = useToast();

  useEffect(() => {
    if (!schema) return;
    let sets: string[] = [];
    if (schema.entitySets && schema.entitySets.length > 0) {
        sets = schema.entitySets.map(es => es.name);
    } else if (schema.entities && schema.entities.length > 0) {
        sets = schema.entities.map(e => e.name + 's');
    }
    setEntitySets(sets);
    if (sets.length > 0) setSelectedEntity(sets[0]);
  }, [schema]);

  const currentSchema = useMemo(() => {
      if (!selectedEntity || !schema || !schema.entities) return null;
      const setInfo = schema.entitySets.find(es => es.name === selectedEntity);
      let entityType = null;
      if (setInfo) {
          const typeName = setInfo.entityType.split('.').pop();
          entityType = schema.entities.find(e => e.name === typeName);
      } else {
          entityType = schema.entities.find(s => selectedEntity.includes(s.name));
      }
      return entityType || null;
  }, [selectedEntity, schema]);

  const generateDefaultConfigs = useCallback((props: { path: string, property: any }[]) => {
      const newConfigs: Record<string, MockFieldConfig> = {};
      props.forEach(item => {
          newConfigs[item.path] = {
              path: item.path,
              property: item.property,
              strategy: suggestStrategy(item.property),
              incrementConfig: { start: 1, step: 1, prefix: '', suffix: '' } 
          };
      });
      return newConfigs;
  }, []);

  useEffect(() => {
      if (!currentSchema || !schema) return;
      const flattened = flattenEntityProperties(currentSchema, schema);
      setFlatProperties(flattened);
      setConfigs(generateDefaultConfigs(flattened));
      setMockData([]);
      setCurrentDraft({});
  }, [currentSchema, schema, generateDefaultConfigs]);

  const updateConfig = (path: string, updates: Partial<MockFieldConfig>) => {
      setConfigs(prev => ({
          ...prev,
          [path]: { ...prev[path], ...updates }
      }));
  };

  const updateIncrementConfig = (path: string, key: keyof AutoIncrementConfig, value: any) => {
      setConfigs(prev => ({
          ...prev,
          [path]: {
              ...prev[path],
              incrementConfig: {
                  ...prev[path].incrementConfig!,
                  [key]: value
              }
          }
      }));
  };

  const handleResetDefaults = () => {
      if (flatProperties.length === 0) return;
      setConfigs(generateDefaultConfigs(flatProperties));
      toast.success("已重置所有字段为默认生成策略 (Reset to defaults)");
  };

  const generateData = () => {
    if (!currentSchema) return;
    const num = parseInt(count) || 5;
    const newData = Array.from({ length: num }).map((_, i) => {
      const row: any = { __id: i, __selected: true };
      Object.values(configs).forEach(conf => {
          const val = generateValue(conf.strategy, conf.property, i, conf.incrementConfig);
          const parts = conf.path.split('.');
          let current = row;
          for (let k = 0; k < parts.length - 1; k++) {
              const part = parts[k];
              if (!current[part]) current[part] = {};
              current = current[part];
          }
          current[parts[parts.length - 1]] = val;
      });
      return row;
    });
    setMockData(newData);
    setCurrentDraft({});
    toast.success(`Generated ${num} rows of data`);
  };

  const { 
      prepareCreate, 
      isOpen: isModalOpen, 
      onOpenChange: onModalOpenChange, 
      codePreview, 
      modalAction, 
      executeBatch 
  } = useEntityActions(
      url, version, schema, selectedEntity, currentSchema, 
      async () => {}, () => {}, () => {}
  );

  const handleCreateSelected = (selectedItems: any[]) => prepareCreate(selectedItems);

  const downloadJson = (content: string, filename: string, type: 'json' | 'xml') => {
      const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'application/xml' });
      const u = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = u; link.download = `${selectedEntity}_Mock.${type === 'json' ? 'json' : 'xml'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(u);
  };

  const mergedJson = useMemo(() => {
      if (mockData.length === 0) return '[]';
      const merged = mockData.map((item, index) => {
          const draft = currentDraft[index];
          if (!draft) return item;
          return { ...item, ...draft };
      });
      return JSON.stringify(merged, null, 2);
  }, [mockData, currentDraft]);

  const handleJsonSync = (newData: any[]) => {
      setMockData(newData);
      setCurrentDraft({});
  };

  const inputClassNames = isDark ? {
      input: "text-xs",
      inputWrapper: "bg-transparent border-[#3e4451] data-[hover=true]:border-[#61afef] group-data-[focus=true]:border-[#61afef]"
  } : {
      input: "text-xs",
      inputWrapper: "bg-transparent border-default-200"
  };

  return (
    <div className="flex flex-col gap-4 h-full relative">
      <Card className={`border shadow-sm shrink-0 bg-transparent ${isDark ? 'border-[#3e4451]' : 'border-divider'}`}>
        <CardBody className="p-3">
           <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
              <div className="flex items-center gap-4 flex-1 w-full">
                <Select 
                    label="Target Entity" 
                    size="sm" 
                    variant="bordered"
                    color="primary" 
                    className="max-w-[240px]"
                    selectedKeys={selectedEntity ? [selectedEntity] : []}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    classNames={{ 
                        trigger: `bg-transparent ${isDark ? "border-[#3e4451]" : "border-default-200"}`,
                        popoverContent: isDark ? "bg-[#282c34] border border-[#3e4451]" : "bg-[#D5F5E3] border border-success-200"
                    }}
                >
                    {entitySets.map(es => <SelectItem key={es} value={es}>{es}</SelectItem>)}
                </Select>
                <Input 
                    label="Row Count" 
                    type="number" 
                    value={count} 
                    onValueChange={setCount} 
                    className="max-w-[100px]" 
                    variant="bordered"
                    color="primary"
                    size="sm"
                    classNames={inputClassNames}
                />
                <Button color="primary" onPress={generateData} startContent={<Sparkles size={16}/>} className="font-semibold">
                  Generate Data
                </Button>
              </div>
           </div>
        </CardBody>
      </Card>

      <div className="flex gap-4 flex-1 min-h-0">
          <div className={`w-[320px] rounded-xl border flex flex-col shrink-0 bg-transparent ${isDark ? 'border-[#3e4451]' : 'border-divider'}`}>
             <div className={`p-3 border-b font-bold text-sm flex items-center gap-2 ${isDark ? 'border-[#3e4451] text-[#abb2bf]' : 'border-divider text-default-600'}`}>
                 <Settings2 size={16} /> Field Configuration
             </div>
             
             <ScrollShadow className="flex-1 p-3">
                 {!currentSchema ? (
                     <div className="text-default-400 text-xs text-center mt-10">Select an Entity first</div>
                 ) : (
                    <div className="flex flex-col gap-4">
                        {flatProperties.map(fp => {
                            const conf = configs[fp.path];
                            if (!conf) return null;
                            const isCompatible = isStrategyCompatible(conf.strategy, fp.property.type);
                            
                            return (
                                <div key={fp.path} className={`flex flex-col gap-1 border-b pb-3 last:border-0 ${isDark ? 'border-[#3e4451]' : 'border-divider/50'}`}>
                                    <div className="flex justify-between items-baseline mb-1">
                                        <label className={`text-[11px] font-bold truncate max-w-[200px] ${isDark ? 'text-[#e5c07b]' : 'text-default-700'}`} title={fp.path}>
                                            {fp.path}
                                            {fp.property.nullable === false && <span className="text-danger ml-1">*</span>}
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <span className={`text-[9px] font-mono px-1 rounded ${isDark ? 'text-[#5c6370] bg-[#282c34]' : 'text-default-400 bg-transparent border border-default-200'}`}>
                                                {fp.property.type.split('.').pop()}
                                            </span>
                                            {!isCompatible && <AlertTriangle size={10} className="text-warning" />}
                                        </div>
                                    </div>
                                    
                                    <StrategySelect 
                                        value={conf.strategy}
                                        odataType={fp.property.type}
                                        onChange={(val) => updateConfig(fp.path, { strategy: val })}
                                        label={fp.path}
                                        isDark={isDark}
                                    />

                                    {conf.strategy === 'custom.increment' && (
                                        <div className={`grid grid-cols-2 gap-2 mt-1 p-2 rounded border bg-transparent ${isDark ? 'border-[#3e4451]' : 'border-divider'}`}>
                                            <Input 
                                                label="Start" size="sm" type="number" 
                                                variant="bordered" color="primary"
                                                classNames={isDark ? { input: "text-[10px]", label: "text-[9px]", inputWrapper: inputClassNames.inputWrapper } : { input: "text-[10px]", label: "text-[9px]" }}
                                                value={String(conf.incrementConfig?.start)}
                                                onValueChange={(v) => updateIncrementConfig(fp.path, 'start', Number(v))}
                                            />
                                            <Input 
                                                label="Step" size="sm" type="number" 
                                                variant="bordered" color="primary"
                                                classNames={isDark ? { input: "text-[10px]", label: "text-[9px]", inputWrapper: inputClassNames.inputWrapper } : { input: "text-[10px]", label: "text-[9px]" }}
                                                value={String(conf.incrementConfig?.step)}
                                                onValueChange={(v) => updateIncrementConfig(fp.path, 'step', Number(v))}
                                            />
                                            <Input 
                                                label="Prefix" size="sm" 
                                                variant="bordered" color="primary"
                                                classNames={isDark ? { input: "text-[10px]", label: "text-[9px]", inputWrapper: inputClassNames.inputWrapper } : { input: "text-[10px]", label: "text-[9px]" }}
                                                value={conf.incrementConfig?.prefix}
                                                onValueChange={(v) => updateIncrementConfig(fp.path, 'prefix', v)}
                                            />
                                            <Input 
                                                label="Suffix" size="sm" 
                                                variant="bordered" color="primary"
                                                classNames={isDark ? { input: "text-[10px]", label: "text-[9px]", inputWrapper: inputClassNames.inputWrapper } : { input: "text-[10px]", label: "text-[9px]" }}
                                                value={conf.incrementConfig?.suffix}
                                                onValueChange={(v) => updateIncrementConfig(fp.path, 'suffix', v)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                 )}
             </ScrollShadow>
             
             <div className={`p-2 border-t ${isDark ? 'border-[#3e4451]' : 'border-divider'}`}>
                 <Button size="sm" variant="light" fullWidth onPress={handleResetDefaults} startContent={<RefreshCw size={14}/>}>
                     Reset to Defaults
                 </Button>
             </div>
          </div>

          <ResultTabs 
             queryResult={mockData}
             rawJsonResult={mergedJson}
             rawXmlResult=""
             loading={false}
             isDark={isDark}
             onDelete={() => {}} 
             onUpdate={() => {}} 
             onExport={() => {}} 
             downloadFile={downloadJson}
             entityName={selectedEntity}
             schema={schema}
             onCreate={handleCreateSelected}
             enableEdit={true}
             enableDelete={false}
             hideUpdateButton={true}
             hideXmlTab={true}
             onDraftChange={setCurrentDraft}
             enableJsonEdit={true}
             onJsonChange={handleJsonSync}
          />
      </div>

      <CodeModal 
          isOpen={isModalOpen}
          onOpenChange={onModalOpenChange}
          code={codePreview}
          action={modalAction}
          onExecute={executeBatch}
          isDark={isDark}
      />
    </div>
  );
};

export default MockDataGenerator;
