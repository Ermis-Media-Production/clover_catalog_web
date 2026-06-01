import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import CartDrawer from "./components/CartDrawer";
import LandingPage from "@/pages/LandingPage";
import Home from "@/pages/Home";
import MenuPage from "@/pages/MenuPage";
import CatalogPage from "@/pages/CatalogPage";
import SyncPage from "@/pages/SyncPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import CouponsPage from "@/pages/CouponsPage";
import PhotosPage from "@/pages/PhotosPage";
import OrdersPage from "@/pages/OrdersPage";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/menu" component={MenuPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/order/:reference" component={OrderConfirmationPage} />
      {/* Admin routes */}
      <Route path="/admin" component={Home} />
      <Route path="/catalog" component={CatalogPage} />
      <Route path="/sync" component={SyncPage} />
      <Route path="/coupons" component={CouponsPage} />
      <Route path="/photos" component={PhotosPage} />
      <Route path="/orders" component={OrdersPage} />
      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <CartDrawer />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
