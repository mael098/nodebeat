"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
    id: number;
    email: string;
    isAdmin: boolean;
    userAccess?: {
        daysAllowed: number;
        expiresAt: string;
        downloadEnabled: boolean;
    } | null;
    createdAt: string;
};

type Payment = {
    id: number;
    userId: number;
    amount: number;
    currency: string;
    note?: string;
    status: string;
    createdAt: string;
    user: {
        id: number;
        email: string;
        subscriptionStatus: string;
        subscriptionEndsAt?: string;
    };
};

type Tab = "users" | "payments";

export default function AdminPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("payments");
    const [users, setUsers] = useState<User[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    // User creation states
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserDays, setNewUserDays] = useState(30);

    // User editing states
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editDays, setEditDays] = useState(30);

    // Payment states
    const [paymentDays, setPaymentDays] = useState(30);
    const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(
        null,
    );
    const [newPaymentUserId, setNewPaymentUserId] = useState("");
    const [newPaymentAmount, setNewPaymentAmount] = useState("");
    const [newPaymentNote, setNewPaymentNote] = useState("");

    const loadData = useCallback(async () => {
        try {
            const [usersRes, paymentsRes] = await Promise.all([
                fetch("/api/admin/users"),
                fetch("/api/admin/payments"),
            ]);

            if (!usersRes.ok || !paymentsRes.ok) {
                if (!usersRes.ok && usersRes.status === 401) {
                    router.replace("/login");
                    return;
                }
                throw new Error("No se pudo cargar los datos");
            }

            const usersData: User[] = await usersRes.json();
            const paymentsData: Payment[] = await paymentsRes.json();

            setUsers(usersData);
            setPayments(paymentsData);
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        const t = setTimeout(() => { void loadData(); }, 0);
        return () => clearTimeout(t);
    }, [loadData]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUserEmail || !newUserPassword) {
            setMessage("Email y contraseña son requeridos");
            return;
        }

        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: newUserEmail,
                    password: newUserPassword,
                    daysAllowed: newUserDays,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al crear usuario");
            }

            setMessage("Usuario creado correctamente");
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserDays(30);
            void loadData();
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        }
    };

    const handleUpdateAccess = async (userId: number, daysAllowed: number) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ daysAllowed }),
            });

            if (!response.ok) {
                throw new Error("Error al actualizar acceso");
            }

            setMessage("Acceso actualizado");
            setEditingUserId(null);
            void loadData();
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        }
    };

    const handleToggleDownload = async (
        userId: number,
        currentState: boolean,
    ) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ downloadEnabled: !currentState }),
            });

            if (!response.ok) {
                throw new Error("Error al actualizar permisos");
            }

            setMessage("Permisos actualizados");
            void loadData();
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        }
    };

    const handleConfirmPayment = async (paymentId: number) => {
        try {
            const response = await fetch(`/api/admin/payments/${paymentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "confirmed", daysAllowed: paymentDays }),
            });

            if (!response.ok) {
                throw new Error("Error al confirmar pago");
            }

            setMessage("Pago confirmado y suscripción activada");
            setSelectedPaymentId(null);
            void loadData();
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        }
    };

    const handleCreatePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPaymentUserId || !newPaymentAmount) {
            setMessage("Usuario y monto son requeridos");
            return;
        }

        try {
            const response = await fetch("/api/admin/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: parseInt(newPaymentUserId, 10),
                    amount: parseFloat(newPaymentAmount),
                    note: newPaymentNote || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al crear pago");
            }

            setMessage("Pago registrado");
            setNewPaymentUserId("");
            setNewPaymentAmount("");
            setNewPaymentNote("");
            void loadData();
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        }
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm("¿Eliminar este pago?")) return;

        try {
            const response = await fetch(`/api/admin/payments/${paymentId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Error al eliminar pago");
            }

            setMessage("Pago eliminado");
            void loadData();
        } catch (error) {
            setMessage(
                `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
            );
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-gray-600">Cargando panel de administrador...</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-8 overflow-hidden rounded-3xl border border-white/70 bg-linear-to-br from-slate-900 via-slate-800 to-blue-900 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-sm dark:border-gray-700 md:p-8">
                <div className="max-w-2xl">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                        Panel de control
                    </p>
                    <h1 className="mb-3 text-3xl font-black text-white md:text-5xl">
                        Administración de NodeBeat
                    </h1>
                    <p className="max-w-xl text-sm leading-6 text-slate-300 md:text-base">
                        Gestiona pagos de usuarios, activa suscripciones y controla acceso a
                        descargas.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-gray-300 dark:border-gray-600">
                <button
                    onClick={() => setTab("payments")}
                    className={`px-4 py-2 font-medium transition ${tab === "payments"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                >
                    💰 Pagos ({payments.length})
                </button>
                <button
                    onClick={() => setTab("users")}
                    className={`px-4 py-2 font-medium transition ${tab === "users"
                            ? "border-b-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                >
                    👥 Usuarios ({users.length})
                </button>
            </div>

            {/* Payments Tab */}
            {tab === "payments" && (
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    {/* Pending Payments */}
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-blue-100/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:shadow-black/20 md:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            Pagos Pendientes de Confirmar
                        </h2>

                        <div className="max-h-96 space-y-2 overflow-y-auto">
                            {payments.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No hay pagos pendientes.
                                </p>
                            ) : (
                                payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
                                    >
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {payment.user.email}
                                            </p>
                                            <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                                Pendiente
                                            </span>
                                        </div>

                                        <p className="text-gray-700 dark:text-gray-300">
                                            Monto:{" "}
                                            <span className="font-semibold">
                                                ${payment.amount} {payment.currency}
                                            </span>
                                        </p>
                                        {payment.note && (
                                            <p className="mt-1 text-gray-600 dark:text-gray-400">
                                                Nota: {payment.note}
                                            </p>
                                        )}

                                        {selectedPaymentId === payment.id ? (
                                            <div className="mt-3 space-y-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={paymentDays}
                                                    onChange={(e) =>
                                                        setPaymentDays(Number(e.target.value))
                                                    }
                                                    placeholder="Días de acceso"
                                                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleConfirmPayment(payment.id)}
                                                        className="flex-1 rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedPaymentId(null)}
                                                        className="flex-1 rounded-lg bg-gray-400 px-3 py-1 text-white hover:bg-gray-500"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedPaymentId(payment.id);
                                                        setPaymentDays(30);
                                                    }}
                                                    className="flex-1 rounded-lg bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                                                >
                                                    Confirmar Pago
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePayment(payment.id)}
                                                    className="flex-1 rounded-lg bg-red-500 px-3 py-1 text-white hover:bg-red-600"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Register Payment */}
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-blue-100/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:shadow-black/20 md:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            Registrar Pago
                        </h2>

                        <form onSubmit={handleCreatePayment} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Usuario
                                </label>
                                <select
                                    value={newPaymentUserId}
                                    onChange={(e) => setNewPaymentUserId(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                >
                                    <option value="">Seleccionar usuario...</option>
                                    {users
                                        .filter(
                                            (u) => !u.userAccess || !u.userAccess.downloadEnabled,
                                        )
                                        .map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.email}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Monto
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newPaymentAmount}
                                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nota (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={newPaymentNote}
                                    onChange={(e) => setNewPaymentNote(e.target.value)}
                                    placeholder="Ej: Pago en efectivo"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 py-2 font-semibold text-white hover:from-cyan-600 hover:to-blue-700"
                            >
                                Registrar Pago
                            </button>
                        </form>

                        {message && (
                            <div className="mt-4 rounded-lg border border-gray-300 bg-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                    {message}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {tab === "users" && (
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-blue-100/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:shadow-black/20 md:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            Usuarios registrados
                        </h2>

                        <div className="max-h-96 space-y-2 overflow-y-auto">
                            {users.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No hay usuarios registrados.
                                </p>
                            ) : (
                                users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-700/70 dark:text-gray-200"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-gray-900 dark:text-white">
                                                    {user.email}
                                                </p>
                                                <div className="mt-1 space-y-1">
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        Vence:{" "}
                                                        <span className="font-medium">
                                                            {user.userAccess?.expiresAt
                                                                ? new Date(
                                                                    user.userAccess.expiresAt,
                                                                ).toLocaleDateString("es-AR")
                                                                : "Sin acceso"}
                                                        </span>
                                                    </p>
                                                    <p className="text-gray-600 dark:text-gray-400">
                                                        Descargas:{" "}
                                                        <span
                                                            className={`font-medium ${user.userAccess?.downloadEnabled
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                                }`}
                                                        >
                                                            {user.userAccess?.downloadEnabled
                                                                ? "Habilitado"
                                                                : "Bloqueado"}
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                {editingUserId === user.id ? (
                                                    <>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={editDays}
                                                            onChange={(e) =>
                                                                setEditDays(Number(e.target.value))
                                                            }
                                                            className="w-16 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800"
                                                        />
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateAccess(user.id, editDays)
                                                            }
                                                            className="rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingUserId(null)}
                                                            className="rounded-lg bg-gray-400 px-3 py-1 text-white hover:bg-gray-500"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUserId(user.id);
                                                                setEditDays(user.userAccess?.daysAllowed || 30);
                                                            }}
                                                            className="rounded-lg bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
                                                        >
                                                            Editar días
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleToggleDownload(
                                                                    user.id,
                                                                    user.userAccess?.downloadEnabled ?? false,
                                                                )
                                                            }
                                                            className={`rounded-lg px-3 py-1 text-white ${user.userAccess?.downloadEnabled
                                                                    ? "bg-red-500 hover:bg-red-600"
                                                                    : "bg-green-500 hover:bg-green-600"
                                                                }`}
                                                        >
                                                            {user.userAccess?.downloadEnabled
                                                                ? "Bloquear"
                                                                : "Permitir"}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg shadow-blue-100/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/90 dark:shadow-black/20 md:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                            Crear usuario
                        </h2>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    placeholder="usuario@example.com"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Días de acceso
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newUserDays}
                                    onChange={(e) => setNewUserDays(Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-linear-to-r from-cyan-500 to-blue-600 py-2 font-semibold text-white hover:from-cyan-600 hover:to-blue-700"
                            >
                                Crear usuario
                            </button>
                        </form>

                        {message && (
                            <div className="mt-4 rounded-lg border border-gray-300 bg-gray-100 p-3 dark:border-gray-600 dark:bg-gray-700">
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                    {message}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
