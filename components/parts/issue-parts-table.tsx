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
  Phone,
  MapPin,
  FileText as InvoiceIcon,
  MessageSquare,
  Smartphone,
  Monitor,
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
  costPrice?: string | null;
  active?: boolean;
}

interface CartItem {
  part: Part;
  quantity: number;
}

export function IssuePartsTable() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSaveAndGeneratePDF = async () => {
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
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          invoiceDate: invoiceDate,
          invoiceNumber: invoiceNumber.trim(),
          notes: notes.trim(),
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
        // Generate PDF after successful save
        await generateAndDownloadPDF(result.data.customerId);

        // Reset form
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setInvoiceDate(new Date().toISOString().split("T")[0]);
        setInvoiceNumber("");
        setNotes("");

        // Redirect to records page
        router.push("/parts/records");
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

  const generateAndDownloadPDF = async (customerId: number) => {
    try {
      const response = await fetch(`/api/issue-parts/${customerId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `invoice-${customerId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      // Don't show error to user, just log it
    }
  };

  // Add part to cart from smart search
  const addToCartFromSearch = (part: Part) => {
    // 🚨 CRITICAL DEBUG: Log real data when adding to cart
    console.log("🛒 ADDING TO CART - Real Part Data:", {
      id: part.id,
      partNumber: part.partNumber,
      name: part.name,
      currentStock: part.currentStock,
      minStock: part.minStock,
      salePrice: part.salePrice,
      costPrice: part.costPrice,
      active: part.active,
    });

    // Allow adding even with 0 stock for testing
    if (part.currentStock <= 0) {
      if (!confirm("این قطعه موجودی صفر دارد. آیا می‌خواهید ادامه دهید؟")) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.part.id === part.id);
      if (existing) {
        const updated = prev.map((item) =>
          item.part.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        console.log(
          "🛒 UPDATED EXISTING CART ITEM:",
          updated.find((item) => item.part.id === part.id)
        );
        return updated;
      }
      const newCart = [...prev, { part, quantity: 1 }];
      console.log("🛒 ADDED NEW CART ITEM:", newCart[newCart.length - 1]);
      return newCart;
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
      console.log("Sending request to API...");
      const response = await fetch("/api/issue-parts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          invoiceDate: invoiceDate,
          invoiceNumber: invoiceNumber.trim(),
          notes: notes.trim(),
          items: cart.map((item) => ({
            partId: item.part.id,
            quantity: item.quantity,
            unitPrice: parseFloat(item.part.salePrice || "0"),
          })),
          action: "save",
        }),
      });

      console.log("Response status:", response.status);

      let result;
      try {
        result = await response.json();
        console.log("Response data:", result);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("پاسخ سرور نامعتبر است");
      }

      if (result.success) {
        console.log("Success, generating PDF...");

        // Generate PDF after successful save
        await generateAndDownloadPDF(result.data.customerId);

        // Reset form
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerAddress("");
        setInvoiceDate(new Date().toISOString().split("T")[0]);
        setInvoiceNumber("");
        setNotes("");

        // Redirect to records page
        router.push("/parts/records");
      } else {
        const errorMessage =
          result.error || result.message || "خطا در ایجاد سند";
        console.error("API error:", errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("Network error:", error);
      setError(
        "خطا در اتصال به سرور: " +
          (error instanceof Error ? error.message : "نامعلوم")
      );
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
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          invoiceDate: invoiceDate,
          invoiceNumber: invoiceNumber.trim(),
          notes: notes.trim(),
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
        setCustomerPhone("");
        setCustomerAddress("");
        setInvoiceDate(new Date().toISOString().split("T")[0]);
        setInvoiceNumber("");
        setNotes("");
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
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <Button
            variant={isMobile ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMobile(true)}
            className={`${isMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground"} px-3`}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant={!isMobile ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMobile(false)}
            className={`${!isMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground"} px-3`}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}
      >
        <SmartSearchEngine onPartSelect={addToCartFromSearch} />

        {/* Cart Section */}
        <Card className="border-mechanical shadow-lg">
          <CardHeader className="bg-mechanical/50 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ShoppingCart className="h-5 w-5 text-primary" />
              سبد صدور
              {cart.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-primary text-primary-foreground"
                >
                  {cart.length} قلم
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {/* Customer Information */}
            <div
              className={`gap-4 ${isMobile ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2"}`}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="نام مشتری"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isLoading}
                  className="border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="شماره تماس"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={isLoading}
                  className="border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="آدرس"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={isLoading}
                  className="border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="تاریخ صدور"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isLoading}
                  className="border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Invoice Information */}
            <div
              className={`gap-4 ${isMobile ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2"}`}
            >
              <div className="flex items-center gap-2">
                <InvoiceIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="شماره فاکتور (اختیاری)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isLoading}
                  className="border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="توضیحات (اختیاری)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isLoading}
                  className="border-border focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 rounded border border-destructive/50">
                {error}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>هیچ قطعه‌ای در سبد وجود ندارد</p>
                <p className="text-sm">قطعات را جستجو و به سبد اضافه کنید</p>
              </div>
            ) : (
              <>
                <div className="border border-border rounded-lg max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.part.id}
                      className={`flex ${isMobile ? "flex-col" : "items-center justify-between"} p-4 border-b border-border hover:bg-accent/30 transition-colors`}
                    >
                      <div className="flex-1 mb-3 sm:mb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                            {item.part.partNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-primary/30"
                          >
                            {item.part.section}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground">
                          {item.part.name}
                        </p>
                        <div
                          className={`flex ${isMobile ? "flex-col gap-1" : "items-center gap-4"} text-sm text-muted-foreground mt-1`}
                        >
                          {/* 🚨 CRITICAL DEBUG: Show real stock data in cart */}
                          <span className="flex items-center gap-1">
                            <span>موجودی:</span>
                            <span
                              className={`font-mono font-bold ${item.part.currentStock <= item.part.minStock ? "text-red-600" : "text-green-600"}`}
                              title="Real stock from Neon DB"
                            >
                              {item.part.currentStock}
                            </span>
                            <span className="text-xs">
                              (حداقل: {item.part.minStock})
                            </span>
                          </span>
                          <span>
                            {parseFloat(
                              item.part.salePrice || "0"
                            ).toLocaleString()}{" "}
                            افغانی
                          </span>
                        </div>
                        {/* Debug info */}
                        <div className="text-xs text-muted-foreground mt-1">
                          Debug: ID={item.part.id} | Real Stock=
                          {item.part.currentStock}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuantity(item.part.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1 || isLoading}
                          className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-mono font-bold">
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
                          className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.part.id)}
                          disabled={isLoading}
                          className="hover:bg-destructive/90"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-foreground">
                      مبلغ کل:
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {getTotalAmount().toLocaleString()} افغانی
                    </span>
                  </div>

                  <div className={`flex gap-3 ${isMobile ? "flex-col" : ""}`}>
                    <Button
                      onClick={handleSaveAndGeneratePDF}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md flex-1"
                    >
                      {isLoading ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="ml-2 h-4 w-4" />
                      )}
                      {isLoading ? "در حال پردازش..." : "ذخیره و ایجاد بل"}
                    </Button>
                    <Button
                      onClick={handleReferToAdmin}
                      disabled={isLoading}
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 flex-1"
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/parts/records");
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
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <Button
            variant={isMobile ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMobile(true)}
            className={`${isMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground"} px-3`}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button
            variant={!isMobile ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsMobile(false)}
            className={`${!isMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground"} px-3`}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-mechanical shadow-lg">
        <CardHeader className="bg-mechanical/50 border-b border-border">
          <CardTitle className="text-foreground flex flex-col sm:flex-row sm:items-center gap-4">
            <span>همه سوابق صدور</span>
            <Input
              placeholder="جستجو بر اساس نام مشتری..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm border-border focus:border-primary focus:ring-primary/20"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded border border-destructive/50 mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال بارگذاری سوابق...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ سابقه صدری یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`flex ${isMobile ? "flex-col" : "items-center justify-between"} p-4 border border-border rounded-lg hover:bg-accent/30 transition-colors`}
                >
                  <div className="flex items-start gap-4 mb-3 sm:mb-0">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground">
                            {record.customerName}
                          </span>
                        </div>
                        <Badge
                          variant={getStatusVariant(record.status)}
                          className={
                            record.status === "completed" ? "bg-primary" : ""
                          }
                        >
                          {getStatusText(record.status)}
                        </Badge>
                      </div>
                      <div
                        className={`flex ${isMobile ? "flex-col gap-1" : "items-center gap-4"} text-sm text-muted-foreground`}
                      >
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.issueDate).toLocaleDateString(
                            "fa-IR"
                          )}
                        </div>
                        {record.partName && <span>{record.partName}</span>}
                        {record.quantity && (
                          <span>تعداد: {record.quantity}</span>
                        )}
                        <span className="font-medium text-foreground">
                          {parseFloat(record.totalAmount).toLocaleString()}{" "}
                          افغانی
                        </span>
                        <span>صادر کننده: {record.issuedBy}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex gap-2 ${isMobile ? "justify-end" : ""}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(record.id)}
                      className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      <Eye className="ml-2 h-4 w-4" />
                      مشاهده جزئیات
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(record.id)}
                      className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
    </div>
  );
}
