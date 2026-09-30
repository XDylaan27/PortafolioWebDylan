'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Package,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';

interface FriendContact {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  user_id: string;
  name: string;
  quantity: number;
  price: number | null;
  image_url: string | null;
  created_at: string;
}

interface FriendOrder {
  id: string;
  user_id: string;
  friend_id: string;
  store_name: string;
  status: 'en_curso' | 'entregado';
  is_paid: boolean;
  notes: string | null;
  created_at: string;
  delivered_at: string | null;
  friend_contacts?: FriendContact;
  friend_order_items: OrderItem[];
}

interface OrderReminder {
  id: string;
  user_id: string;
  friend_id: string | null;
  remind_at: string;
  note: string | null;
  notified: boolean;
  created_at: string;
}

interface DraftOrderItem {
  localId: string;
  existingId?: string;
  name: string;
  quantity: string;
  price: string;
  imageUrl: string | null;
  imageFile: File | null;
  previewUrl: string | null;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function createEmptyDraftItem(): DraftOrderItem {
  return {
    localId: crypto.randomUUID(),
    name: '',
    quantity: '1',
    price: '',
    imageUrl: null,
    imageFile: null,
    previewUrl: null,
  };
}

export default function PedidosAmigosPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  // Navegación principal: 'inicio' (pedidos en curso) | 'amigos' (listado y detalle de amigo) | 'recordatorios'
  const [activeTab, setActiveTab] = useState<'inicio' | 'amigos' | 'recordatorios'>('inicio');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Datos desde Supabase
  const [friends, setFriends] = useState<FriendContact[]>([]);
  const [orders, setOrders] = useState<FriendOrder[]>([]);
  const [reminders, setReminders] = useState<OrderReminder[]>([]);

  // Mensajes de feedback
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Modal: Nuevo Amigo
  const friendDialogRef = useRef<HTMLDialogElement | null>(null);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendNotes, setNewFriendNotes] = useState('');
  const [savingFriend, setSavingFriend] = useState(false);

  // Modal: Crear / Editar Pedido
  const orderDialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderFriendId, setOrderFriendId] = useState('');
  const [inlineFriendName, setInlineFriendName] = useState('');
  const [orderStoreName, setOrderStoreName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderIsPaid, setOrderIsPaid] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([createEmptyDraftItem()]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Modal: Recordatorio ("¿Cuándo vas a hacer pedido?")
  const reminderDialogRef = useRef<HTMLDialogElement | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [reminderFriendId, setReminderFriendId] = useState('');
  const [reminderNote, setReminderNote] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Lightbox para ver imágenes en grande
  const lightboxDialogRef = useRef<HTMLDialogElement | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption: string } | null>(null);

  const showToast = (type: 'error' | 'success', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // Cargar datos del usuario autenticado
  const loadAllData = useCallback(async (currentUser: User) => {
    setDataLoading(true);
    try {
      const [friendsRes, ordersRes, remindersRes] = await Promise.all([
        supabase
          .from('friend_contacts')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('name', { ascending: true }),
        supabase
          .from('friend_orders')
          .select('*, friend_order_items(*)')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('friend_order_reminders')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('remind_at', { ascending: true }),
      ]);

      if (friendsRes.data) setFriends(friendsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data as FriendOrder[]);
      if (remindersRes.data) setReminders(remindersRes.data);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Escuchar sesión de Supabase
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadAllData(currentUser);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadAllData(currentUser);
      } else {
        setFriends([]);
        setOrders([]);
        setReminders([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAllData]);

  // Fallback de light-dismiss para navegadores sin soporte nativo de closedby="any"
  useEffect(() => {
    if (typeof window === 'undefined' || 'closedBy' in HTMLDialogElement.prototype) return;

    const dialogs = [
      friendDialogRef.current,
      orderDialogRef.current,
      reminderDialogRef.current,
      lightboxDialogRef.current,
    ].filter((d): d is HTMLDialogElement => d !== null);

    const handleBackdropClick = (event: MouseEvent) => {
      const dialog = event.currentTarget as HTMLDialogElement;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        dialog.close();
      }
    };

    dialogs.forEach((d) => d.addEventListener('click', handleBackdropClick));
    return () => {
      dialogs.forEach((d) => d.removeEventListener('click', handleBackdropClick));
    };
  }, [user]);

  // Disparar notificación nativa vía Service Worker o Notification API
  const triggerSystemNotification = useCallback(async (title: string, body: string, tag: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_ORDER_REMINDER',
            title,
            body,
            tag,
            url: '/lab/pedidos-amigos',
          });
          return;
        }
      }
      new Notification(title, {
        body,
        icon: '/icon.svg',
        tag,
      });
    } catch {
      // Fallback silencioso si el navegador bloquea la notificación
    }
  }, []);

  // Monitorear recordatorios vencidos cada 15 segundos
  useEffect(() => {
    if (!user || reminders.length === 0) return;

    const checkDueReminders = async () => {
      const now = new Date();
      const due = reminders.filter((r) => !r.notified && new Date(r.remind_at) <= now);

      if (due.length === 0) return;

      for (const rem of due) {
        const friendName = friends.find((f) => f.id === rem.friend_id)?.name;
        const bodyText = rem.note
          ? `${rem.note}${friendName ? ` (Con ${friendName})` : ''}`
          : friendName
          ? `Tenías planeado hacer un pedido con ${friendName}. ¡No olvides registrarlo!`
          : 'Tenías programado hacer un pedido hoy. ¡Entra y regístralo!';

        await triggerSystemNotification(
          '¿Ya hiciste pedido? Regístralo',
          bodyText,
          `reminder-${rem.id}`
        );

        await supabase
          .from('friend_order_reminders')
          .update({ notified: true })
          .eq('id', rem.id)
          .eq('user_id', user.id);
      }

      // Actualizar estado local
      const dueIds = new Set(due.map((d) => d.id));
      setReminders((prev) =>
        prev.map((r) => (dueIds.has(r.id) ? { ...r, notified: true } : r))
      );
      showToast('success', '🔔 Recordatorio: ¿Ya hiciste pedido? ¡Regístralo!');
    };

    checkDueReminders();
    const interval = setInterval(checkDueReminders, 15000);
    return () => clearInterval(interval);
  }, [user, reminders, friends, triggerSystemNotification]);

  // Mapas y cálculos rápidos
  const friendsMap = useMemo(() => {
    const map = new Map<string, FriendContact>();
    friends.forEach((f) => map.set(f.id, f));
    return map;
  }, [friends]);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'en_curso'),
    [orders]
  );

  const selectedFriend = useMemo(
    () => (selectedFriendId ? friendsMap.get(selectedFriendId) ?? null : null),
    [selectedFriendId, friendsMap]
  );

  const selectedFriendOrders = useMemo(() => {
    if (!selectedFriendId) return { active: [], delivered: [] };
    const all = orders.filter((o) => o.friend_id === selectedFriendId);
    return {
      active: all.filter((o) => o.status === 'en_curso'),
      delivered: all.filter((o) => o.status === 'entregado'),
    };
  }, [orders, selectedFriendId]);

  const calculateOrderTotal = (items: OrderItem[]) => {
    return items.reduce((acc, item) => {
      if (item.price === null || item.price === undefined) return acc;
      return acc + Number(item.price) * Number(item.quantity || 1);
    }, 0);
  };

  // --- Acciones de Amigos ---
  const handleCreateFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cleanName = newFriendName.trim();
    if (!cleanName) return;

    setSavingFriend(true);
    try {
      const { data, error } = await supabase
        .from('friend_contacts')
        .insert({
          user_id: user.id,
          name: cleanName.slice(0, 80),
          notes: newFriendNotes.trim() ? newFriendNotes.trim().slice(0, 300) : null,
        })
        .select('*')
        .single();

      if (error) throw error;

      setFriends((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFriendName('');
      setNewFriendNotes('');
      friendDialogRef.current?.close();
      showToast('success', `Amigo "${data.name}" agregado.`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error al agregar amigo.');
    } finally {
      setSavingFriend(false);
    }
  };

  // --- Subida segura de imagen a Supabase Storage ---
  const uploadItemImage = async (file: File, currentUserId: string): Promise<string> => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.');
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('La imagen supera el límite máximo de 5 MB.');
    }

    const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const filePath = `${currentUserId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('order-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Error al subir imagen: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('order-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // --- Abrir modal para crear o editar pedido ---
  const openNewOrderModal = (preselectedFriendId?: string) => {
    setEditingOrderId(null);
    setOrderFriendId(preselectedFriendId || friends[0]?.id || '__new__');
    setInlineFriendName('');
    setOrderStoreName('');
    setOrderNotes('');
    setOrderIsPaid(false);
    setDraftItems([createEmptyDraftItem()]);
    orderDialogRef.current?.showModal();
  };

  const openEditOrderModal = (order: FriendOrder) => {
    setEditingOrderId(order.id);
    setOrderFriendId(order.friend_id);
    setInlineFriendName('');
    setOrderStoreName(order.store_name);
    setOrderNotes(order.notes || '');
    setOrderIsPaid(order.is_paid);

    if (order.friend_order_items && order.friend_order_items.length > 0) {
      setDraftItems(
        order.friend_order_items.map((it) => ({
          localId: crypto.randomUUID(),
          existingId: it.id,
          name: it.name,
          quantity: String(it.quantity || 1),
          price: it.price !== null && it.price !== undefined ? String(it.price) : '',
          imageUrl: it.image_url,
          imageFile: null,
          previewUrl: it.image_url,
        }))
      );
    } else {
      setDraftItems([createEmptyDraftItem()]);
    }

    orderDialogRef.current?.showModal();
  };

  const handleDraftItemFileChange = (localId: string, file: File | null) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast('error', 'Solo se permiten imágenes JPG, PNG, WEBP o GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showToast('error', 'La imagen no debe pesar más de 5 MB.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setDraftItems((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? { ...item, imageFile: file, previewUrl: preview }
          : item
      )
    );
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validItems = draftItems.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      showToast('error', 'Agrega al menos un artículo a la lista de cosas que pediste.');
      return;
    }

    setSavingOrder(true);
    try {
      let targetFriendId = orderFriendId;

      // Si eligió crear amigo rápido dentro del mismo modal
      if (targetFriendId === '__new__' || friends.length === 0) {
        const cleanInlineFriend = inlineFriendName.trim();
        if (!cleanInlineFriend) {
          throw new Error('Escribe el nombre de tu amigo para registrar el pedido.');
        }
        const { data: createdFriend, error: friendErr } = await supabase
          .from('friend_contacts')
          .insert({
            user_id: user.id,
            name: cleanInlineFriend.slice(0, 80),
          })
          .select('*')
          .single();

        if (friendErr || !createdFriend) {
          throw new Error('No se pudo registrar al amigo.');
        }
        targetFriendId = createdFriend.id;
      }

      const cleanStore = orderStoreName.trim()
        ? orderStoreName.trim().slice(0, 120)
        : 'Pedido Online';
      const cleanNotes = orderNotes.trim() ? orderNotes.trim().slice(0, 500) : null;

      let currentOrderId = editingOrderId;

      if (!currentOrderId) {
        // Crear nuevo pedido
        const { data: createdOrder, error: orderErr } = await supabase
          .from('friend_orders')
          .insert({
            user_id: user.id,
            friend_id: targetFriendId,
            store_name: cleanStore,
            status: 'en_curso',
            is_paid: orderIsPaid,
            notes: cleanNotes,
          })
          .select('*')
          .single();

        if (orderErr || !createdOrder) throw orderErr || new Error('Error creando pedido.');
        currentOrderId = createdOrder.id;
      } else {
        // Actualizar pedido existente
        const { error: updateErr } = await supabase
          .from('friend_orders')
          .update({
            friend_id: targetFriendId,
            store_name: cleanStore,
            is_paid: orderIsPaid,
            notes: cleanNotes,
          })
          .eq('id', currentOrderId)
          .eq('user_id', user.id);

        if (updateErr) throw updateErr;

        // Reemplazar lista de artículos del pedido de forma limpia
        await supabase
          .from('friend_order_items')
          .delete()
          .eq('order_id', currentOrderId)
          .eq('user_id', user.id);
      }

      // Procesar imágenes y preparar artículos
      const itemsToInsert = [];
      for (const item of validItems) {
        let finalImageUrl = item.imageUrl;
        if (item.imageFile) {
          finalImageUrl = await uploadItemImage(item.imageFile, user.id);
        }

        const parsedQty = Math.max(1, Math.min(9999, parseInt(item.quantity, 10) || 1));
        const parsedPrice =
          item.price.trim() !== '' && Number.isFinite(Number(item.price))
            ? Math.max(0, Number(Number(item.price).toFixed(2)))
            : null;

        itemsToInsert.push({
          order_id: currentOrderId,
          user_id: user.id,
          name: item.name.trim().slice(0, 160),
          quantity: parsedQty,
          price: parsedPrice,
          image_url: finalImageUrl,
        });
      }

      const { error: itemsErr } = await supabase
        .from('friend_order_items')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      await loadAllData(user);
      orderDialogRef.current?.close();
      showToast(
        'success',
        editingOrderId ? 'Pedido actualizado correctamente.' : '¡Pedido registrado en curso!'
      );
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar el pedido.');
    } finally {
      setSavingOrder(false);
    }
  };

  // --- Cambiar estado (en_curso <-> entregado) o pago ---
  const handleToggleOrderStatus = async (order: FriendOrder) => {
    if (!user) return;
    const nextStatus = order.status === 'en_curso' ? 'entregado' : 'en_curso';
    const deliveredAt = nextStatus === 'entregado' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('friend_orders')
      .update({ status: nextStatus, delivered_at: deliveredAt })
      .eq('id', order.id)
      .eq('user_id', user.id);

    if (error) {
      showToast('error', 'No se pudo actualizar el estado del pedido.');
      return;
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, status: nextStatus, delivered_at: deliveredAt } : o
      )
    );
    showToast(
      'success',
      nextStatus === 'entregado'
        ? '¡Pedido marcado como entregado!'
        : 'Pedido devuelto a "En curso".'
    );
  };

  const handleToggleOrderPaid = async (order: FriendOrder) => {
    if (!user) return;
    const nextPaid = !order.is_paid;

    const { error } = await supabase
      .from('friend_orders')
      .update({ is_paid: nextPaid })
      .eq('id', order.id)
      .eq('user_id', user.id);

    if (error) {
      showToast('error', 'No se pudo actualizar el estado de pago.');
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, is_paid: nextPaid } : o))
    );
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('friend_orders')
      .delete()
      .eq('id', orderId)
      .eq('user_id', user.id);

    if (error) {
      showToast('error', 'Error al eliminar el pedido.');
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    showToast('success', 'Pedido eliminado.');
  };

  // --- Recordatorios ("¿Cuándo vas a hacer pedido?") ---
  const openReminderModal = () => {
    // Por defecto sugerir hoy en 1 hora o mañana a las 12:00
    const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
    const yyyy = defaultDate.getFullYear();
    const mm = String(defaultDate.getMonth() + 1).padStart(2, '0');
    const dd = String(defaultDate.getDate()).padStart(2, '0');
    const hh = String(defaultDate.getHours()).padStart(2, '0');
    const min = String(defaultDate.getMinutes()).padStart(2, '0');

    setReminderDate(`${yyyy}-${mm}-${dd}`);
    setReminderTime(`${hh}:${min}`);
    setReminderFriendId(selectedFriendId || '');
    setReminderNote('');
    reminderDialogRef.current?.showModal();
  };

  const requestNotificationAccess = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('error', 'Tu navegador no soporta notificaciones del sistema.');
      return false;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    return perm === 'granted';
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!reminderDate || !reminderTime) {
      showToast('error', 'Elige la fecha y la hora del recordatorio.');
      return;
    }

    const remindAtDate = new Date(`${reminderDate}T${reminderTime}`);
    if (isNaN(remindAtDate.getTime())) {
      showToast('error', 'Fecha u hora inválida.');
      return;
    }

    setSavingReminder(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      }

      const { data, error } = await supabase
        .from('friend_order_reminders')
        .insert({
          user_id: user.id,
          friend_id: reminderFriendId || null,
          remind_at: remindAtDate.toISOString(),
          note: reminderNote.trim() ? reminderNote.trim().slice(0, 200) : null,
          notified: false,
        })
        .select('*')
        .single();

      if (error || !data) throw error || new Error('Error guardando recordatorio.');

      setReminders((prev) =>
        [...prev, data].sort(
          (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
        )
      );
      reminderDialogRef.current?.close();
      showToast(
        'success',
        'Recordatorio programado. Te avisaremos: "¿Ya hiciste pedido? Regístralo".'
      );
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error al guardar recordatorio.');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!user) return;
    await supabase.from('friend_order_reminders').delete().eq('id', id).eq('user_id', user.id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // --- Componente reutilizable de Tarjeta de Pedido ---
  const renderOrderCard = (order: FriendOrder, showFriendBadge = true) => {
    const friend = friendsMap.get(order.friend_id);
    const total = calculateOrderTotal(order.friend_order_items || []);
    const hasPrices = (order.friend_order_items || []).some(
      (i) => i.price !== null && i.price !== undefined
    );

    return (
      <article
        key={order.id}
        className="border border-neutral-800 bg-neutral-900/40 rounded-lg p-5 space-y-4 transition-colors hover:border-neutral-700"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800/80 pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                  order.status === 'en_curso'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {order.status === 'en_curso' ? (
                  <>
                    <Clock className="w-3 h-3" />
                    En curso
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-3 h-3" />
                    Entregado
                  </>
                )}
              </span>

              {showFriendBadge && friend && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFriendId(friend.id);
                    setActiveTab('amigos');
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
                >
                  <Users className="w-3 h-3 text-sky-400" />
                  <span>Pedido con {friend.name}</span>
                </button>
              )}

              <span className="text-xs font-mono text-neutral-500">
                {new Date(order.created_at).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h3 className="text-lg font-serif-editorial font-medium text-white">
              {order.store_name}
            </h3>
            {order.notes && (
              <p className="text-xs text-neutral-400 leading-relaxed">{order.notes}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleOrderPaid(order)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                order.is_paid
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
              title="Cambiar estado de pago"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{order.is_paid ? 'Pagado' : 'Pendiente de pago'}</span>
            </button>

            <button
              type="button"
              onClick={() => openEditOrderModal(order)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-700 hover:border-neutral-500 text-xs font-mono text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modificar</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleOrderStatus(order)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                order.status === 'en_curso'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                  : 'border border-neutral-700 hover:border-neutral-500 text-neutral-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {order.status === 'en_curso' ? 'Dar por entregado' : 'Reabrir pedido'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteOrder(order.id)}
              className="p-1.5 rounded border border-transparent hover:border-red-500/30 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
              title="Eliminar pedido"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lista de cosas pedidas */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            Cosas que pedí ({order.friend_order_items?.length || 0})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(order.friend_order_items || []).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded border border-neutral-800/90 bg-neutral-950/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxImage({ url: item.image_url!, caption: item.name });
                        lightboxDialogRef.current?.showModal();
                      }}
                      className="relative group w-12 h-12 rounded overflow-hidden border border-neutral-700 shrink-0 cursor-pointer"
                      title="Ver imagen en grande"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </span>
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded border border-neutral-800 bg-neutral-900/60 flex items-center justify-center shrink-0 text-neutral-600">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm text-neutral-100 font-medium truncate">{item.name}</p>
                    <p className="text-xs font-mono text-neutral-400">
                      Cant: {item.quantity}
                      {item.price !== null && item.price !== undefined && (
                        <> &bull; ${Number(item.price).toFixed(2)} c/u</>
                      )}
                    </p>
                  </div>
                </div>

                {item.price !== null && item.price !== undefined && (
                  <div className="text-xs font-mono text-neutral-200 font-medium shrink-0">
                    ${(Number(item.price) * Number(item.quantity || 1)).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {hasPrices && (
          <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">Total estimado del pedido:</span>
            <span className="text-sm text-white font-semibold">${total.toFixed(2)}</span>
          </div>
        )}
      </article>
    );
  };

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 flex items-center justify-center gap-3 text-neutral-400 font-mono text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        <span>Verificando sesión segura...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 space-y-8">
        <div className="p-8 rounded-lg border border-neutral-800 bg-neutral-900/40 space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <ShieldCheck className="w-4 h-4" />
            <span>Espacio Protegido por Usuario (Supabase RLS)</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif-editorial font-light text-white">
            Pedidos con Amigos & Recordatorios
          </h1>
          <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
            Para ver tus pedidos en curso, tu lista de amigos, subir fotos de los artículos que encargaste y recibir notificaciones de recordatorio, inicia sesión con tu cuenta de Google o tu Username/Correo usando el botón <strong className="text-white font-mono">Iniciar sesión</strong> de la barra superior.
          </p>
        </div>
      </div>
    );
  }

  const pendingReminders = reminders.filter((r) => !r.notified);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Encabezado y Acciones Rápidas */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sincronizado en Supabase Cloud</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif-editorial font-light text-white">
            Pedidos con Amigos
          </h1>
          <p className="text-sm text-neutral-400 max-w-xl">
            Lleva el control de los pedidos que haces con tus amigos, revisa qué encargaste con fotos, modifica pedidos en curso y programa recordatorios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openReminderModal}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded border border-neutral-700 hover:border-amber-400/60 bg-neutral-900/80 hover:bg-neutral-900 text-amber-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            <span>Añadir recordatorio</span>
          </button>

          <button
            type="button"
            onClick={() => friendDialogRef.current?.showModal()}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded border border-neutral-700 hover:border-neutral-500 bg-neutral-900/80 text-neutral-200 text-xs font-mono transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-sky-400" />
            <span>Nuevo amigo</span>
          </button>

          <button
            type="button"
            onClick={() => openNewOrderModal(selectedFriendId || undefined)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-mono font-medium transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Hacer un pedido</span>
          </button>
        </div>
      </div>

      {/* Mensaje Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded border text-xs font-mono flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pestañas de Navegación */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-4">
        <button
          type="button"
          onClick={() => {
            setActiveTab('inicio');
            setSelectedFriendId(null);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono transition-colors cursor-pointer ${
            activeTab === 'inicio'
              ? 'bg-white text-neutral-950 font-medium'
              : 'border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Inicio: Pedidos en Curso ({activeOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('amigos')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono transition-colors cursor-pointer ${
            activeTab === 'amigos'
              ? 'bg-white text-neutral-950 font-medium'
              : 'border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Mis Amigos ({friends.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recordatorios')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono transition-colors cursor-pointer ${
            activeTab === 'recordatorios'
              ? 'bg-white text-neutral-950 font-medium'
              : 'border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Recordatorios ({pendingReminders.length})</span>
        </button>
      </div>

      {dataLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-xs font-mono text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Cargando tus pedidos y amigos...</span>
        </div>
      ) : (
        <>
          {/* VISTA 1: INICIO (PEDIDOS EN CURSO) */}
          {activeTab === 'inicio' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400">
                  Pedidos actualmente en curso ({activeOrders.length})
                </h2>
              </div>

              {activeOrders.length === 0 ? (
                <div className="p-12 border border-dashed border-neutral-800 rounded-lg text-center space-y-4">
                  <Package className="w-8 h-8 text-neutral-600 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-base text-neutral-200 font-serif-editorial">
                      No tienes pedidos en curso en este momento
                    </p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      Cuando un amigo vaya a hacer un pedido por internet, regístralo aquí con las cosas e imágenes que le encargaste.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => openNewOrderModal()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white text-neutral-950 text-xs font-mono font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Hacer un pedido</span>
                    </button>
                    <button
                      type="button"
                      onClick={openReminderModal}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded border border-neutral-700 text-neutral-300 text-xs font-mono cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5 text-amber-400" />
                      <span>Programar recordatorio</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => renderOrderCard(order, true))}
                </div>
              )}
            </section>
          )}

          {/* VISTA 2: LISTADO DE AMIGOS Y DETALLE POR AMIGO */}
          {activeTab === 'amigos' && (
            <section className="space-y-6">
              {!selectedFriend ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400">
                      Selecciona un amigo para ver sus pedidos en curso e historial
                    </h2>
                  </div>

                  {friends.length === 0 ? (
                    <div className="p-12 border border-dashed border-neutral-800 rounded-lg text-center space-y-4">
                      <Users className="w-8 h-8 text-neutral-600 mx-auto" />
                      <p className="text-sm text-neutral-300">
                        Aún no has agregado amigos a tu lista.
                      </p>
                      <button
                        type="button"
                        onClick={() => friendDialogRef.current?.showModal()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white text-neutral-950 text-xs font-mono font-medium cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Agregar mi primer amigo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {friends.map((friend) => {
                        const friendOrders = orders.filter((o) => o.friend_id === friend.id);
                        const activeCount = friendOrders.filter(
                          (o) => o.status === 'en_curso'
                        ).length;
                        const deliveredCount = friendOrders.filter(
                          (o) => o.status === 'entregado'
                        ).length;

                        return (
                          <div
                            key={friend.id}
                            onClick={() => setSelectedFriendId(friend.id)}
                            className="group p-5 rounded-lg border border-neutral-800 bg-neutral-900/40 hover:border-neutral-600 transition-all cursor-pointer flex flex-col justify-between gap-4"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xl font-serif-editorial text-white group-hover:underline">
                                  {friend.name}
                                </h3>
                                {activeCount > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono">
                                    {activeCount} en curso
                                  </span>
                                )}
                              </div>
                              {friend.notes && (
                                <p className="text-xs text-neutral-400 line-clamp-2">
                                  {friend.notes}
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-400">
                              <span>{friendOrders.length} pedidos totales</span>
                              <span>{deliveredCount} entregados &rarr;</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* DETALLE DE UN AMIGO */
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-neutral-800 bg-neutral-900/30">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedFriendId(null)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white mb-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Volver al listado de amigos</span>
                      </button>
                      <h2 className="text-2xl md:text-3xl font-serif-editorial text-white">
                        Pedidos con {selectedFriend.name}
                      </h2>
                      {selectedFriend.notes && (
                        <p className="text-xs text-neutral-400">{selectedFriend.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => openNewOrderModal(selectedFriend.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-mono font-medium cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Hacer un pedido con {selectedFriend.name}</span>
                      </button>
                    </div>
                  </div>

                  {/* Pedidos en curso de este amigo */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Pedidos en curso con {selectedFriend.name} ({selectedFriendOrders.active.length})</span>
                    </h3>
                    {selectedFriendOrders.active.length === 0 ? (
                      <p className="text-xs font-mono text-neutral-500 p-4 border border-neutral-800/60 rounded">
                        No hay ningún pedido en curso con {selectedFriend.name}.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {selectedFriendOrders.active.map((order) =>
                          renderOrderCard(order, false)
                        )}
                      </div>
                    )}
                  </div>

                  {/* Historial de pedidos entregados de este amigo */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4" />
                      <span>
                        Historial de pedidos realizados y entregados ({selectedFriendOrders.delivered.length})
                      </span>
                    </h3>
                    {selectedFriendOrders.delivered.length === 0 ? (
                      <p className="text-xs font-mono text-neutral-500 p-4 border border-neutral-800/60 rounded">
                        Aún no hay pedidos entregados en el historial con {selectedFriend.name}.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {selectedFriendOrders.delivered.map((order) =>
                          renderOrderCard(order, false)
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* VISTA 3: RECORDATORIOS */}
          {activeTab === 'recordatorios' && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border border-neutral-800 bg-neutral-900/30">
                <div className="space-y-1">
                  <h2 className="text-lg font-serif-editorial text-white">
                    Recordatorios de Pedidos
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Programa cuándo vas a hacer un pedido para recibir la notificación: <strong className="text-neutral-200">&ldquo;¿Ya hiciste pedido? Regístralo&rdquo;</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {notificationPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={requestNotificationAccess}
                      className="px-3 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono cursor-pointer"
                    >
                      Activar permiso de notificaciones
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      triggerSystemNotification(
                        '¿Ya hiciste pedido? Regístralo',
                        'Prueba de notificación activa en tu dispositivo.',
                        'test-reminder'
                      )
                    }
                    className="px-3 py-2 rounded border border-neutral-700 hover:border-neutral-500 text-xs font-mono text-neutral-300 cursor-pointer"
                  >
                    Probar notificación
                  </button>
                  <button
                    type="button"
                    onClick={openReminderModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-white text-neutral-950 text-xs font-mono font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo recordatorio</span>
                  </button>
                </div>
              </div>

              {reminders.length === 0 ? (
                <p className="text-xs font-mono text-neutral-500 p-8 border border-dashed border-neutral-800 rounded text-center">
                  No tienes recordatorios programados.
                </p>
              ) : (
                <div className="space-y-3">
                  {reminders.map((rem) => {
                    const friend = rem.friend_id ? friendsMap.get(rem.friend_id) : null;
                    return (
                      <div
                        key={rem.id}
                        className="p-4 rounded border border-neutral-800 bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                                rem.notified
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {rem.notified ? 'Notificado' : 'Programado'}
                            </span>
                            <span className="text-xs font-mono text-white">
                              {new Date(rem.remind_at).toLocaleString('es-MX', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            {friend && (
                              <span className="text-xs font-mono text-sky-400">
                                &bull; Con {friend.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-300">
                            {rem.note || '¿Ya hiciste pedido? Regístralo'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openNewOrderModal(rem.friend_id || undefined)}
                            className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-mono font-medium cursor-pointer"
                          >
                            Registrar pedido ahora
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReminder(rem.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 cursor-pointer"
                            title="Eliminar recordatorio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* MODAL 1: AGREGAR AMIGO */}
      <dialog
        ref={friendDialogRef}
        closedby="any"
        aria-labelledby="friend-modal-title"
        className="m-auto w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-100 p-0 shadow-2xl backdrop:bg-black/70"
      >
        <form onSubmit={handleCreateFriend} className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 id="friend-modal-title" className="text-xl font-serif-editorial">
              Agregar Amigo
            </h3>
            <button
              type="button"
              onClick={() => friendDialogRef.current?.close()}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="friend-name" className="block text-xs font-mono text-neutral-400">
              Nombre o apodo de tu amigo
            </label>
            <input
              id="friend-name"
              type="text"
              required
              maxLength={80}
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              placeholder="Ej. Carlos, Sofía, Primo Luis..."
              className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm font-mono text-white focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="friend-notes" className="block text-xs font-mono text-neutral-400">
              Nota opcional (cuenta CLABE, tienda frecuente, etc.)
            </label>
            <input
              id="friend-notes"
              type="text"
              maxLength={300}
              value={newFriendNotes}
              onChange={(e) => setNewFriendNotes(e.target.value)}
              placeholder="Opcional..."
              className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm font-mono text-white focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => friendDialogRef.current?.close()}
              className="px-4 py-2 rounded border border-neutral-800 text-xs font-mono text-neutral-400 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingFriend}
              className="px-4 py-2 rounded bg-white text-neutral-950 text-xs font-mono font-medium cursor-pointer disabled:opacity-50"
            >
              {savingFriend ? 'Guardando...' : 'Guardar amigo'}
            </button>
          </div>
        </form>
      </dialog>

      {/* MODAL 2: HACER / MODIFICAR UN PEDIDO */}
      <dialog
        ref={orderDialogRef}
        closedby="any"
        aria-labelledby="order-modal-title"
        className="m-auto w-full max-w-2xl rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-100 p-0 shadow-2xl backdrop:bg-black/75 max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSaveOrder} className="p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                {editingOrderId ? 'Editar Pedido' : 'Nuevo Encargo'}
              </span>
              <h3 id="order-modal-title" className="text-2xl font-serif-editorial">
                {editingOrderId ? 'Modificar pedido en curso' : 'Hacer un pedido con amigo'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => orderDialogRef.current?.close()}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="order-friend" className="block text-xs font-mono text-neutral-400">
                ¿Qué amigo hace el pedido?
              </label>
              <select
                id="order-friend"
                value={orderFriendId}
                onChange={(e) => setOrderFriendId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm font-mono text-white"
              >
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                <option value="__new__">+ Agregar un nuevo amigo...</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="order-store" className="block text-xs font-mono text-neutral-400">
                Tienda / Plataforma
              </label>
              <input
                id="order-store"
                type="text"
                required
                maxLength={120}
                value={orderStoreName}
                onChange={(e) => setOrderStoreName(e.target.value)}
                placeholder="Ej. Amazon, Shein, AliExpress, Temu..."
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm font-mono text-white"
              />
            </div>
          </div>

          {(orderFriendId === '__new__' || friends.length === 0) && (
            <div className="space-y-1.5 p-3.5 rounded border border-sky-500/30 bg-sky-500/5">
              <label htmlFor="inline-friend-name" className="block text-xs font-mono text-sky-300">
                Nombre de tu nuevo amigo
              </label>
              <input
                id="inline-friend-name"
                type="text"
                required
                maxLength={80}
                value={inlineFriendName}
                onChange={(e) => setInlineFriendName(e.target.value)}
                placeholder="Ej. Diego"
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm font-mono text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <label htmlFor="order-notes" className="block text-xs font-mono text-neutral-400">
                Nota general (opcional)
              </label>
              <input
                id="order-notes"
                type="text"
                maxLength={500}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ej. Llega la próxima semana"
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-sm font-mono text-white"
              />
            </div>

            <label className="flex items-center gap-2.5 pt-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={orderIsPaid}
                onChange={(e) => setOrderIsPaid(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-xs font-mono text-neutral-200">
                ¿Ya se lo pagué a mi amigo?
              </span>
            </label>
          </div>

          {/* Lista de cosas que le pedí */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-300">
                Lista de cosas que le pedí ({draftItems.length})
              </span>
              <button
                type="button"
                onClick={() => setDraftItems((prev) => [...prev, createEmptyDraftItem()])}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-neutral-700 hover:border-white text-xs font-mono text-neutral-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar otro artículo</span>
              </button>
            </div>

            <p className="text-[11px] font-mono text-neutral-500">
              Tip: En cualquier artículo puedes subir una foto o pegar directamente una captura con <kbd className="px-1 py-0.5 bg-neutral-800 rounded">Ctrl+V</kbd>.
            </p>

            <div className="space-y-3">
              {draftItems.map((item, idx) => (
                <div
                  key={item.localId}
                  onPaste={(e) => {
                    const files = e.clipboardData?.files;
                    if (files && files.length > 0) {
                      e.preventDefault();
                      handleDraftItemFileChange(item.localId, files[0]);
                    }
                  }}
                  className="p-3.5 rounded border border-neutral-800 bg-neutral-900/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-400">
                      Artículo #{idx + 1}
                    </span>
                    {draftItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraftItems((prev) =>
                            prev.filter((i) => i.localId !== item.localId)
                          )
                        }
                        className="text-xs font-mono text-neutral-500 hover:text-red-400 cursor-pointer"
                      >
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        required
                        maxLength={160}
                        value={item.name}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((i) =>
                              i.localId === item.localId ? { ...i, name: e.target.value } : i
                            )
                          )
                        }
                        placeholder="¿Qué le encargaste? (ej. Tenis talla 27)"
                        className="w-full px-3 py-1.5 rounded border border-neutral-800 bg-neutral-950 text-xs font-mono text-white"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={item.quantity}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((i) =>
                              i.localId === item.localId
                                ? { ...i, quantity: e.target.value }
                                : i
                            )
                          )
                        }
                        placeholder="Cant."
                        className="w-full px-2.5 py-1.5 rounded border border-neutral-800 bg-neutral-950 text-xs font-mono text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.price}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((i) =>
                              i.localId === item.localId ? { ...i, price: e.target.value } : i
                            )
                          )
                        }
                        placeholder="Precio opc. ($)"
                        className="w-full px-2.5 py-1.5 rounded border border-neutral-800 bg-neutral-950 text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  {/* Selector de imagen opcional */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      {item.previewUrl ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden border border-neutral-700">
                          <img
                            src={item.previewUrl}
                            alt="Vista previa"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setDraftItems((prev) =>
                                prev.map((i) =>
                                  i.localId === item.localId
                                    ? { ...i, imageFile: null, previewUrl: null, imageUrl: null }
                                    : i
                                )
                              )
                            }
                            className="absolute top-0 right-0 bg-black/80 text-white p-0.5 cursor-pointer"
                            title="Quitar imagen"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border border-dashed border-neutral-700 flex items-center justify-center text-neutral-600">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-[11px] font-mono text-neutral-300 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>{item.previewUrl ? 'Cambiar imagen' : 'Subir imagen (opcional)'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(e) =>
                            handleDraftItemFileChange(
                              item.localId,
                              e.target.files?.[0] || null
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => orderDialogRef.current?.close()}
              className="px-4 py-2 rounded border border-neutral-800 text-xs font-mono text-neutral-400 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingOrder}
              className="inline-flex items-center gap-2 px-5 py-2 rounded bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-mono font-medium cursor-pointer disabled:opacity-50"
            >
              {savingOrder && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingOrderId ? 'Guardar cambios' : 'Registrar pedido'}</span>
            </button>
          </div>
        </form>
      </dialog>

      {/* MODAL 3: AÑADIR RECORDATORIO ("¿Cuándo vas a hacer pedido?") */}
      <dialog
        ref={reminderDialogRef}
        closedby="any"
        aria-labelledby="reminder-modal-title"
        className="m-auto w-full max-w-md rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-100 p-0 shadow-2xl backdrop:bg-black/70"
      >
        <form onSubmit={handleSaveReminder} className="p-6 space-y-4">
          <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
                Notificación Programada
              </span>
              <h3 id="reminder-modal-title" className="text-xl font-serif-editorial mt-0.5">
                ¿Cuándo vas a hacer pedido?
              </h3>
            </div>
            <button
              type="button"
              onClick={() => reminderDialogRef.current?.close()}
              className="text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Elige el día y la hora. Ese día te llegará una notificación preguntando: <strong className="text-white">&ldquo;¿Ya hiciste pedido? Regístralo&rdquo;</strong> para que no se te pase anotarlo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="rem-date" className="block text-xs font-mono text-neutral-400">
                Fecha
              </label>
              <input
                id="rem-date"
                type="date"
                required
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-xs font-mono text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rem-time" className="block text-xs font-mono text-neutral-400">
                Hora
              </label>
              <input
                id="rem-time"
                type="time"
                required
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-xs font-mono text-white"
              />
            </div>
          </div>

          {friends.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="rem-friend" className="block text-xs font-mono text-neutral-400">
                ¿Con qué amigo? (opcional)
              </label>
              <select
                id="rem-friend"
                value={reminderFriendId}
                onChange={(e) => setReminderFriendId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-xs font-mono text-white"
              >
                <option value="">Cualquier amigo / General</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="rem-note" className="block text-xs font-mono text-neutral-400">
              Nota opcional (ej. Pedido de Shein / Amazon)
            </label>
            <input
              id="rem-note"
              type="text"
              maxLength={200}
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              placeholder="Ej. Encargar sudadera con Carlos"
              className="w-full px-3 py-2 rounded border border-neutral-800 bg-neutral-900 text-xs font-mono text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => reminderDialogRef.current?.close()}
              className="px-4 py-2 rounded border border-neutral-800 text-xs font-mono text-neutral-400 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingReminder}
              className="px-4 py-2 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-mono font-medium cursor-pointer disabled:opacity-50"
            >
              {savingReminder ? 'Programando...' : 'Programar recordatorio'}
            </button>
          </div>
        </form>
      </dialog>

      {/* MODAL 4: LIGHTBOX PARA VER IMÁGENES EN GRANDE */}
      <dialog
        ref={lightboxDialogRef}
        closedby="any"
        aria-label="Vista previa de imagen del artículo"
        className="m-auto max-w-3xl w-full rounded-lg border border-neutral-800 bg-neutral-950 text-white p-4 shadow-2xl backdrop:bg-black/85"
      >
        {lightboxImage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-neutral-200">
                {lightboxImage.caption}
              </span>
              <button
                type="button"
                onClick={() => lightboxDialogRef.current?.close()}
                className="p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black rounded">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.caption}
                className="max-h-[72vh] w-auto object-contain"
              />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
