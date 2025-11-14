// components/parts/issue-parts-table.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  Save,
  Send,
  Loader2,
  FileText,
  Calendar,
  Eye,
  Download,
} from "lucide-react";
import { SmartSearchEngine } from "./smart-search-engine";

// Define interfaces
interface Part {
  id: number;
  partNumber: string;
  name: string;
  section: "E" | "D" | "F" | "G" | "OLD";
  currentStock: number;
  salePrice: string | null;
  minStock: number;
}

interface CartItem {
  part: Part;
  quantity: number;
}

export function IssuePartsTable() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add part to cart from smart search
  const addToCartFromSearch = (part: Part) => {
    // Allow adding even with 0 stock for testing
    if (part.currentStock <= 0) {
      if (!confirm("این قطعه موجودی صفر دارد. آیا می‌خواهید ادامه دهید؟")) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        return prev.map((item) =>
          item.part.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { part, quantity: 1 }];
    });
  };

  // Cart management functions
  const updateQuantity = (partId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(partId);
      return;
    }

    const cartItem = cart.find((item) => item.part.id === partId);
    if (cartItem && newQuantity > cartItem.part.currentStock) {
      alert(`موجودی موجود: ${cartItem.part.currentStock}`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.part.id === partId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (partId: number) => {
    setCart((prev) => prev.filter((item) => item.part.id !== partId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.part.salePrice || "0");
      return total + price * item.quantity;
    }, 0);
  };

  const handleSave = async () => {
    if (!customerName.trim()) {
      alert("لطفاً نام مشتری را وارد کنید");
      return;
    }

    if (cart.length === 0) {
      alert("لطفاً قطعات را به سبد اضافه کنید");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/issue-parts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: cart.map((item) => ({
            partId: item.part.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.part.salePrice || "0"),
          })),
          action: "save",
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setCart([]);
        setCustomerName("");
        // Redirect to records page
        router.push("/issue-records");
      } else {
        setError(result.message || "خطا در ایجاد سند");
      }
    } catch (error) {
      console.error("Error saving issue:", error);
      setError("خطا در اتصال به سرور");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReferToAdmin = async () => {
    if (!customerName.trim()) {
      alert("لطفاً نام مشتری را وارد کنید");
      return;
    }

    if (cart.length === 0) {
      alert("لطفاً قطعات را به سبد اضافه کنید");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/issue-parts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: cart.map((item) => ({
            partId: item.part.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.part.salePrice || "0"),
          })),
          action: "refer",
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("سند برای تأیید مدیر ارسال شد");
        setCart([]);
        setCustomerName("");
      } else {
        setError(result.message || "خطا در ارسال به مدیر");
      }
    } catch (error) {
      console.error("Error referring to admin:", error);
      setError("خطا در اتصال به سرور");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SmartSearchEngine onPartSelect={addToCartFromSearch} />

      {/* Cart Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            سبد صدور
            {cart.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {cart.length} قلم
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="نام مشتری"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ قطعه‌ای در سبد وجود ندارد</p>
              <p className="text-sm">قطعات را جستجو و به سبد اضافه کنید</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.part.id}
                    className="flex items-center justify-between p-4 border-b"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm">
                          {item.part.partNumber}
                        </span>
                        <Badge variant="outline">{item.part.section}</Badge>
                      </div>
                      <p className="font-medium">{item.part.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>موجودی: {item.part.currentStock}</span>
                        <span>
                          {parseFloat(
                            item.part.salePrice || "0"
                          ).toLocaleString()}{" "}
                          افغانی
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateQuantity(item.part.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1 || isLoading}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-mono">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateQuantity(item.part.id, item.quantity + 1)
                        }
                        disabled={
                          item.quantity >= item.part.currentStock || isLoading
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.part.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold">مبلغ کل:</span>
                  <span className="text-xl font-bold">
                    {getTotalAmount().toLocaleString()} افغانی
                  </span>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="ml-2 h-4 w-4" />
                    )}
                    {isLoading ? "در حال پردازش..." : "ذخیره و ایجاد بل"}
                  </Button>
                  <Button
                    onClick={handleReferToAdmin}
                    disabled={isLoading}
                    variant="outline"
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {isLoading ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="ml-2 h-4 w-4" />
                    )}
                    ارسال به مدیر
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Issue Records Table Component (keep existing)
interface IssueRecord {
  id: number;
  customerName: string;
  totalAmount: string;
  issueDate: string;
  itemCount: number;
  status: "completed" | "pending" | "approved";
  issuedBy: string;
  partNumber?: string;
  partName?: string;
  quantity?: number;
}

export function IssueRecordsTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [records, setRecords] = useState<IssueRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/issue-records");
      const result = await response.json();

      if (result.success) {
        setRecords(result.data);
      } else {
        setError("خطا در بارگذاری سوابق");
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      setError("خطا در اتصال به سرور");

      // Fallback to empty array if API fails
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter((record) =>
    record.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "approved":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "تکمیل شده";
      case "approved":
        return "تأیید شده";
      case "pending":
        return "در انتظار";
      default:
        return status;
    }
  };

  const handleDownloadPDF = (recordId: number) => {
    // Implement PDF download logic
    console.log("Download PDF for record:", recordId);
  };

  const handleViewDetails = (recordId: number) => {
    // Implement view details logic
    console.log("View details for record:", recordId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>همه سوابق صدور</CardTitle>
        <div className="flex gap-4">
          <Input
            placeholder="جستجو بر اساس نام مشتری..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200 mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری سوابق...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            هیچ سابقه صدری یافت نشد
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        {record.customerName}
                      </span>
                      <Badge variant={getStatusVariant(record.status)}>
                        {getStatusText(record.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(record.issueDate).toLocaleDateString("fa-IR")}
                      </div>
                      {record.partName && <span>{record.partName}</span>}
                      {record.quantity && <span>تعداد: {record.quantity}</span>}
                      <span>
                        {parseFloat(record.totalAmount).toLocaleString()} افغانی
                      </span>
                      <span>صادر کننده: {record.issuedBy}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(record.id)}
                  >
                    <Eye className="ml-2 h-4 w-4" />
                    مشاهده جزئیات
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPDF(record.id)}
                  >
                    <Download className="ml-2 h-4 w-4" />
                    دریافت PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
