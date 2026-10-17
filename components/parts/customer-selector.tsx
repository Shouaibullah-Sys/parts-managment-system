// components/parts/customer-selector.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Phone, MapPin, Search, X, UserPlus } from "lucide-react";

interface Customer {
  id: number;
  name: string;
  normalizedName: string;
  phone: string | null;
  address: string | null;
}

interface CustomerSelectorProps {
  onCustomerSelect: (customer: Customer | null) => void;
  onNewCustomer: () => void;
  disabled?: boolean;
  // پیش‌پرکردن مشتری هنگام بارگذاری یک پیش‌نویس
  initialCustomer?: Customer | null;
}

export function CustomerSelector({
  onCustomerSelect,
  onNewCustomer,
  disabled = false,
  initialCustomer = null,
}: CustomerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  // بعد از انتخاب مشتری، مقدار ورودی به نام مشتری تغییر می‌کند؛ این فلگ
  // جلوی اجرای دوباره‌ی جستجو (و باز شدن مجدد منو) را می‌گیرد.
  const skipNextSearch = useRef(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // هم‌گام‌سازی با مشتری پیش‌پر‌شده (بارگذاری پیش‌نویس از والد)
  useEffect(() => {
    if (initialCustomer) {
      skipNextSearch.current = true;
      setSelectedCustomer(initialCustomer);
      setSearchQuery(initialCustomer.name);
      setShowResults(false);
      setSearchResults([]);
      setHighlightedIndex(-1);
    } else {
      setSelectedCustomer(null);
      setSearchQuery("");
      setShowResults(false);
      setSearchResults([]);
      setHighlightedIndex(-1);
    }
  }, [initialCustomer]);

  // Search customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (skipNextSearch.current) {
        skipNextSearch.current = false;
        return;
      }

      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        setHighlightedIndex(-1);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/customers/search?q=${encodeURIComponent(searchQuery)}`
        );
        const result = await response.json();

        if (result.success) {
          setSearchResults(result.data);
          setHighlightedIndex(result.data.length > 0 ? 0 : -1);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    skipNextSearch.current = true;
    setSelectedCustomer(customer);
    setSearchQuery(customer.name);
    setShowResults(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
    onCustomerSelect(customer);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowResults(false);
      return;
    }

    if (!showResults || searchResults.length === 0) {
      if (e.key === "ArrowDown" && searchResults.length > 0) {
        e.preventDefault();
        setShowResults(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (i) => (i - 1 + searchResults.length) % searchResults.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0;
      handleSelectCustomer(searchResults[idx]);
    }
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setSearchResults([]);
    onCustomerSelect(null);
  };

  const handleNewCustomer = () => {
    handleClearSelection();
    onNewCustomer();
  };

  return (
    <div className="space-y-3" ref={searchRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="جستجو مشتری (نام، شماره تماس، یا شناسه)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true);
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="pr-10 border-border focus:border-primary focus:ring-primary/20"
            />
            {selectedCustomer && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearSelection}
                disabled={disabled}
                className="absolute left-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {searchResults.map((customer, index) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-right p-3 transition-colors border-b border-border last:border-b-0 ${
                    index === highlightedIndex ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">
                          {customer.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ID: {customer.id}
                        </Badge>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">
                            {customer.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {showResults &&
            searchQuery.trim().length >= 2 &&
            searchResults.length === 0 &&
            !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
                <p>مشتری یافت نشد</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleNewCustomer}
                  className="mt-2"
                >
                  <UserPlus className="ml-2 h-4 w-4" />
                  ایجاد مشتری جدید
                </Button>
              </div>
            )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleNewCustomer}
          disabled={disabled}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <UserPlus className="ml-2 h-4 w-4" />
          مشتری جدید
        </Button>
      </div>

      {/* Selected Customer Info */}
      {selectedCustomer && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  {selectedCustomer.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  ID: {selectedCustomer.id}
                </Badge>
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
              {selectedCustomer.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{selectedCustomer.address}</span>
                </div>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
