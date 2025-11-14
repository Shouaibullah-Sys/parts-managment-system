// components/parts/smart-search-engine.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, Clock, Filter, Sparkles } from "lucide-react";

interface Part {
  id: number;
  partNumber: string;
  name: string;
  section: "E" | "D" | "F" | "G" | "OLD";
  currentStock: number;
  salePrice: string | null;
  minStock: number;
}

interface SearchResult {
  part: Part;
  score: number;
  matchType: "exact" | "semantic" | "fuzzy";
}

interface SmartSearchEngineProps {
  onPartSelect: (part: Part) => void;
}

export function SmartSearchEngine({ onPartSelect }: SmartSearchEngineProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [model, setModel] = useState<any>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const searchIndex = useRef<Map<string, number[]>>(new Map());
  const allParts = useRef<Part[]>([]);

  // Load machine learning model for semantic search
  useEffect(() => {
    loadModel();
    loadPartsData();
  }, []);

  const loadModel = async () => {
    try {
      setIsModelLoading(true);
      // Load Universal Sentence Encoder for semantic search
      const use = await import("@tensorflow-models/universal-sentence-encoder");
      const loadedModel = await use.load();
      setModel(loadedModel);
      console.log("ML model loaded successfully");
    } catch (error) {
      console.error("Error loading ML model:", error);
      // Fallback to traditional search
    } finally {
      setIsModelLoading(false);
    }
  };

  const loadPartsData = async () => {
    try {
      const response = await fetch("/api/parts?limit=1000");
      const result = await response.json();
      if (result.success) {
        allParts.current = result.data;
        await buildSearchIndex(result.data);
      }
    } catch (error) {
      console.error("Error loading parts data:", error);
    }
  };

  const buildSearchIndex = async (parts: Part[]) => {
    if (!model) return;

    try {
      // Create embeddings for all parts for fast semantic search
      const sentences = parts.map(
        (p) => `${p.partNumber} ${p.name} ${p.section}`
      );

      const embeddings = await model.embed(sentences);
      const embeddingsArray = await embeddings.array();

      parts.forEach((part, index) => {
        searchIndex.current.set(part.id.toString(), embeddingsArray[index]);
      });
    } catch (error) {
      console.error("Error building search index:", error);
    }
  };

  // Smart search with multiple strategies
  const performSmartSearch = async (query: string): Promise<SearchResult[]> => {
    const startTime = performance.now();

    if (!query.trim() || allParts.current.length === 0) {
      return [];
    }

    let searchResults: SearchResult[] = [];

    // Strategy 1: Exact match (highest priority)
    const exactMatches = allParts.current
      .filter(
        (part) =>
          part.partNumber.toLowerCase() === query.toLowerCase() ||
          part.name.toLowerCase() === query.toLowerCase()
      )
      .map((part) => ({
        part,
        score: 1.0,
        matchType: "exact" as const,
      }));

    // Strategy 2: Fuzzy match (partial matches)
    const fuzzyMatches = allParts.current
      .filter(
        (part) =>
          part.partNumber.toLowerCase().includes(query.toLowerCase()) ||
          part.name.toLowerCase().includes(query.toLowerCase()) ||
          part.partNumber
            .toLowerCase()
            .replace(/\s/g, "")
            .includes(query.toLowerCase().replace(/\s/g, ""))
      )
      .map((part) => {
        const partNumberScore = part.partNumber
          .toLowerCase()
          .includes(query.toLowerCase())
          ? 0.8
          : 0;
        const nameScore = part.name.toLowerCase().includes(query.toLowerCase())
          ? 0.7
          : 0;
        return {
          part,
          score: Math.max(partNumberScore, nameScore),
          matchType: "fuzzy" as const,
        };
      });

    // Strategy 3: Semantic search using ML (if model is available)
    let semanticMatches: SearchResult[] = [];
    if (model && searchIndex.current.size > 0) {
      try {
        semanticMatches = await performSemanticSearch(query);
      } catch (error) {
        console.error("Semantic search failed:", error);
      }
    }

    // Combine and deduplicate results
    const allMatches = [...exactMatches, ...fuzzyMatches, ...semanticMatches];
    const seenIds = new Set();
    const uniqueResults = allMatches
      .filter((result) => {
        if (seenIds.has(result.part.id)) return false;
        seenIds.add(result.part.id);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Limit results for performance

    const endTime = performance.now();
    setSearchTime(endTime - startTime);

    return uniqueResults;
  };

  const performSemanticSearch = async (
    query: string
  ): Promise<SearchResult[]> => {
    if (!model) return [];

    try {
      // Create embedding for query
      const queryEmbedding = await model.embed([query]);
      const queryVector = (await queryEmbedding.array())[0];

      // Calculate cosine similarity with all parts
      const similarities: SearchResult[] = [];

      for (const [partId, partVector] of searchIndex.current.entries()) {
        const similarity = cosineSimilarity(queryVector, partVector);
        if (similarity > 0.3) {
          // Threshold for semantic matches
          const part = allParts.current.find((p) => p.id === parseInt(partId));
          if (part) {
            similarities.push({
              part,
              score: similarity * 0.6, // Weight semantic matches slightly lower than exact matches
              matchType: "semantic",
            });
          }
        }
      }

      return similarities;
    } catch (error) {
      console.error("Error in semantic search:", error);
      return [];
    }
  };

  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  };

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchResults = await performSmartSearch(searchTerm);
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const getMatchBadge = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return <Badge className="bg-green-500">دقیق</Badge>;
      case "fuzzy":
        return <Badge className="bg-blue-500">شبیه</Badge>;
      case "semantic":
        return <Badge className="bg-purple-500">هوشمند</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          جستجوی هوشمند قطعات
          {isModelLoading && (
            <Badge variant="outline" className="text-xs">
              در حال بارگذاری هوش مصنوعی...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            placeholder="شماره قطعه یا نام را وارد کنید... (جستجوی هوشمند)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Search Stats */}
        {searchTime > 0 && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{searchTime.toFixed(0)} میلی‌ثانیه</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>
                {results.length} نتیجه
                {model && " (هوش مصنوعی)"}
              </span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">
              در حال جستجوی هوشمند...
            </p>
          </div>
        ) : results.length > 0 ? (
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={result.part.id}
                className="flex items-center justify-between p-4 border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onPartSelect(result.part)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm">
                      {result.part.partNumber}
                    </span>
                    <Badge variant="outline">{result.part.section}</Badge>
                    {getMatchBadge(result.matchType)}
                    <span className="text-xs text-muted-foreground">
                      امتیاز: {(result.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="font-medium">{result.part.name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>موجودی: {result.part.currentStock}</span>
                    <span>
                      قیمت:{" "}
                      {parseFloat(
                        result.part.salePrice || "0"
                      ).toLocaleString()}{" "}
                      تومان
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  انتخاب
                </Button>
              </div>
            ))}
          </div>
        ) : searchTerm.length >= 2 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>هیچ قطعه‌ای یافت نشد</p>
            <p className="text-sm">از کلمات کلیدی مختلف استفاده کنید</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
