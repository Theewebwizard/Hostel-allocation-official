import React, { useState, useEffect } from "react";
import { 
  Check, 
  X, 
  Save, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  Building2,
  ChevronDown,
  ChevronRight,
  Layers,
  Info
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui";
import { adminApi, type Hostel } from "~/lib/api";

interface RulesMatrixProps {
  hostels: Hostel[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface HostelConfig {
  years: Record<number, boolean>;
  wings: Record<string, Record<number, boolean>>;
}

export const RulesMatrix: React.FC<RulesMatrixProps> = ({ 
  hostels, 
  onSuccess, 
  onError 
}) => {
  const [matrix, setMatrix] = useState<Record<number, HostelConfig>>({});
  const [expandedHostels, setExpandedHostels] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const years = [1, 2, 3, 4];

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getRulesMatrix();
      setMatrix(res.data);
    } catch (err) {
      onError("Failed to load rules matrix");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHostelYear = (hostelId: number, year: number) => {
    setMatrix(prev => {
      const config = prev[hostelId] || { years: {}, wings: {} };
      const newValue = !(config.years?.[year] || false);
      
      const newConfig = {
        ...config,
        years: { ...config.years, [year]: newValue },
        // Sync wings: if master is toggled, all wings match
        wings: Object.keys(config.wings || {}).reduce((acc, wing) => ({
          ...acc,
          [wing]: { ...config.wings[wing], [year]: newValue }
        }), {})
      };

      return { ...prev, [hostelId]: newConfig };
    });
  };

  const toggleWingYear = (hostelId: number, wing: string, year: number) => {
    setMatrix(prev => {
      const config = prev[hostelId];
      const newValue = !(config.wings[wing]?.[year] || false);
      
      const newWings = {
        ...config.wings,
        [wing]: { ...config.wings[wing], [year]: newValue }
      };

      // Check if all wings are now true for this year
      const allWingsAllowed = Object.values(newWings).every(w => w[year]);
      
      return {
        ...prev,
        [hostelId]: {
          ...config,
          wings: newWings,
          // If any wing is disabled, the hostel-wide rule is disabled
          years: { ...config.years, [year]: allWingsAllowed }
        }
      };
    });
  };

  const toggleExpand = (hostelId: number) => {
    setExpandedHostels(prev => {
      const next = new Set(prev);
      if (next.has(hostelId)) next.delete(hostelId);
      else next.add(hostelId);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await adminApi.saveRulesMatrix(matrix);
      onSuccess("Hierarchical eligibility configuration saved successfully!");
    } catch (err) {
      onError("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <Card className="border-indigo-100 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <ShieldCheck className="w-6 h-6" />
              Hierarchical Eligibility Matrix
            </CardTitle>
            <CardDescription className="text-indigo-700 mt-1">
              Toggle eligibility at the Hostel level for bulk actions, or expand to control specific Wings.
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 px-6"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-indigo-100">
                <th className="p-6 text-left w-72 border-r border-indigo-50">
                  <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <Building2 className="w-4 h-4" />
                    Hostel & Wings
                  </div>
                </th>
                {years.map(year => (
                  <th key={year} className="p-6 text-center border-r border-indigo-50 last:border-r-0">
                    <div className="flex flex-col items-center">
                      <span className="text-indigo-600 font-black text-lg leading-none">Y{year}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Year {year}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {hostels.map(hostel => {
                const config = matrix[hostel.id] || { years: {}, wings: {} };
                const isExpanded = expandedHostels.has(hostel.id);
                const wingNames = Object.keys(config.wings).sort();

                return (
                  <React.Fragment key={hostel.id}>
                    {/* Hostel Row */}
                    <tr className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="p-4 border-r border-indigo-50 bg-white group-hover:bg-indigo-50/50">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleExpand(hostel.id)}
                            className="p-1 hover:bg-indigo-100 rounded-md transition-colors text-indigo-400"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <div>
                            <span className="font-black text-slate-900 text-base block leading-tight">{hostel.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Master Control</span>
                          </div>
                        </div>
                      </td>
                      {years.map(year => {
                        const isAllowed = config.years?.[year] || false;
                        // Determine if it's a "partial" state (some wings allowed, others not)
                        const allowedWingsCount = Object.values(config.wings).filter(w => w[year]).length;
                        const isPartial = allowedWingsCount > 0 && allowedWingsCount < Object.keys(config.wings).length;

                        return (
                          <td 
                            key={year} 
                            className="p-4 text-center border-r border-indigo-50 last:border-r-0"
                          >
                            <button
                              onClick={() => toggleHostelYear(hostel.id, year)}
                              className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 ${
                                isAllowed 
                                  ? 'bg-green-500 ring-green-100' 
                                  : isPartial 
                                    ? 'bg-amber-400 ring-amber-100'
                                    : 'bg-slate-200 ring-slate-100'
                              }`}
                            >
                              <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 transform flex items-center justify-center ${
                                isAllowed ? 'translate-x-5' : 'translate-x-0'
                              }`}>
                                {isAllowed 
                                  ? <Check className="w-3.5 h-3.5 text-green-600 font-bold" /> 
                                  : isPartial 
                                    ? <Layers className="w-3 h-3 text-amber-600" />
                                    : <X className="w-3.5 h-3.5 text-slate-400" />
                                }
                              </div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Wing Rows (Expandable) */}
                    {isExpanded && wingNames.map(wing => (
                      <tr key={`${hostel.id}-${wing}`} className="bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                        <td className="py-3 pl-14 pr-6 border-r border-indigo-50">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
                            <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">Wing {wing}</span>
                          </div>
                        </td>
                        {years.map(year => {
                          const isAllowed = config.wings[wing]?.[year] || false;
                          return (
                            <td 
                              key={year} 
                              className="p-3 text-center border-r border-indigo-50 last:border-r-0"
                            >
                              <button
                                onClick={() => toggleWingYear(hostel.id, wing, year)}
                                className={`w-10 h-6 rounded-full relative transition-all duration-300 focus:outline-none ${
                                  isAllowed ? 'bg-indigo-500' : 'bg-slate-200'
                                }`}
                              >
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 transform flex items-center justify-center ${
                                  isAllowed ? 'translate-x-4' : 'translate-x-0'
                                }`}>
                                  {isAllowed 
                                    ? <Check className="w-3 h-3 text-indigo-600" /> 
                                    : <X className="w-3 h-3 text-slate-300" />
                                  }
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-indigo-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Hierarchical Logic</p>
            <ul className="text-[11px] text-slate-500 mt-1 space-y-1 list-disc ml-4">
              <li>Toggling a <span className="font-bold">Hostel</span> switch updates all its wings automatically.</li>
              <li>A <span className="text-amber-600 font-bold">Yellow toggle</span> indicates granular control (some wings allowed).</li>
              <li>The engine respects Wing-specific rules over Hostel-wide defaults.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
