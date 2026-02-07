import { Route, Outlet } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { FeatureGuard } from "@/components/auth/FeatureGuard";
import { AdminGuard } from "@/components/auth/AdminGuard";

// Pages
import { MastersPage } from "@/features/masters/pages/MastersPage";
import { SupplierProductsPage } from "@/features/supplier-products/pages/SupplierProductsPage";
import { UomConversionsPage } from "@/features/uom-conversions/pages/UomConversionsPage";
import { WarehousesListPage } from "@/features/warehouses";
import { SuppliersListPage } from "@/features/suppliers";
import { CustomersListPage } from "@/features/customers";
import { CustomerItemsListPage } from "@/features/customer-items/pages/CustomerItemsListPage";
import { MastersBulkLoadPage } from "@/features/masters/pages/MastersBulkLoadPage";
import { SupplierAssignmentsPage } from "@/features/assignments/pages/SupplierAssignmentsPage";
import { ShippingMasterListPage } from "@/features/shipping-master/pages/ShippingMasterListPage";
import { DeliveryPlacesListPage } from "@/features/delivery-places";
import MakersPage from "@/features/makers/pages/MakersPage";
import { WarehouseDeliveryRoutesListPage } from "@/features/warehouse-delivery-routes";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { RolesListPage } from "@/features/roles/pages/RolesListPage";

const FeatureGuardLayout = ({ feature }: { feature: string }) => (
    <FeatureGuard feature={feature}>
        <Outlet />
    </FeatureGuard>
);

export function MasterRoutes() {
    return (
        <Route element={<FeatureGuardLayout feature="masters" />}>
            {/* Masters - Phase G-1 */}
            <Route path="/masters" element={<MastersPage />} />
            <Route
                path={ROUTES.MASTERS.SUPPLIER_PRODUCTS}
                element={
                    <FeatureGuard feature="masters:supplier-products">
                        <SupplierProductsPage />
                    </FeatureGuard>
                }
            />
            <Route
                path="/masters/uom-conversions"
                element={
                    <FeatureGuard feature="masters:uom-conversions">
                        <UomConversionsPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.WAREHOUSES}
                element={
                    <FeatureGuard feature="masters:warehouses">
                        <WarehousesListPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.SUPPLIERS}
                element={
                    <FeatureGuard feature="masters:suppliers">
                        <SuppliersListPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.CUSTOMERS}
                element={
                    <FeatureGuard feature="masters:customers">
                        <CustomersListPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.CUSTOMER_ITEMS}
                element={
                    <FeatureGuard feature="masters:customer-items">
                        <CustomerItemsListPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.BULK_LOAD}
                element={
                    <FeatureGuard feature="masters:bulk-load">
                        <MastersBulkLoadPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.SUPPLIER_ASSIGNMENTS}
                element={
                    <FeatureGuard feature="masters:supplier-assignments">
                        <SupplierAssignmentsPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.SHIPPING_MASTERS}
                element={
                    <FeatureGuard feature="masters:shipping-masters">
                        <ShippingMasterListPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.DELIVERY_PLACES}
                element={
                    <FeatureGuard feature="masters:delivery-places">
                        <DeliveryPlacesListPage />
                    </FeatureGuard>
                }
            />
            <Route
                path={ROUTES.MASTERS.MAKERS}
                element={
                    <FeatureGuard feature="masters:makers">
                        <MakersPage />
                    </FeatureGuard>
                }
            />
            <Route
                path="/warehouse-delivery-routes"
                element={
                    <FeatureGuard feature="masters:warehouse-delivery-routes">
                        <WarehouseDeliveryRoutesListPage />
                    </FeatureGuard>
                }
            />

            {/* Settings - Phase G-2 (Admin Only) */}
            <Route
                path={ROUTES.SETTINGS.USERS}
                element={
                    <AdminGuard>
                        <UsersListPage />
                    </AdminGuard>
                }
            />

            <Route
                path={ROUTES.SETTINGS.ROLES}
                element={
                    <AdminGuard>
                        <RolesListPage />
                    </AdminGuard>
                }
            />
        </Route>
    );
}
