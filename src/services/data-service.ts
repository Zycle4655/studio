
'use server';

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import type { MaterialDocument } from "@/schemas/material";
import type { FacturaCompraDocument } from "@/schemas/compra";
import type { FacturaVentaDocument } from "@/schemas/venta";

export async function getInventory(userId: string): Promise<MaterialDocument[]> {
    if (!userId || !db) return [];
    const materialsRef = collection(db, "companyProfiles", userId, "materials");
    const materialsSnapshot = await getDocs(query(materialsRef, orderBy("stock", "desc")));
    return materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialDocument));
}

export async function getRecentPurchases(userId: string, recordLimit: number = 5): Promise<FacturaCompraDocument[]> {
    if (!userId || !db) return [];
    const invoicesRef = collection(db, "companyProfiles", userId, "purchaseInvoices");
    const q = query(invoicesRef, orderBy("fecha", "desc"), limit(recordLimit));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacturaCompraDocument));
}

export async function getRecentSales(userId: string, recordLimit: number = 5): Promise<FacturaVentaDocument[]> {
    if (!userId || !db) return [];
    const invoicesRef = collection(db, "companyProfiles", userId, "saleInvoices");
    const q = query(invoicesRef, orderBy("fecha", "desc"), limit(recordLimit));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FacturaVentaDocument));
}
