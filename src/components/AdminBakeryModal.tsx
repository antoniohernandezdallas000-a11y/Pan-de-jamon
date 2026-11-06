import React, { useEffect, useState } from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  ImagePlus,
  Lock,
  MapPin,
  Palette,
  ShieldAlert,
  Sparkles,
  Upload,
  UserCheck,
  Utensils,
  X,
} from 'lucide-react';
import {
  Bakery,
  COMPETITION_LOGO_PATH,
  UserRole,
} from '../types/competition';
import { AdminBakeryInput } from '../utils/competitionLogic';

interface AdminBakeryModalProps {
  isOpen: boolean;
  editingBakery: Bakery | null;
  existingBakeriesCount: number;
  currentUserUid: string;
  currentUserRole: UserRole;
  onClose: () => void;
  onSwitchToAdminRole: () => void;
  onSaveBakery: (
    input: AdminBakeryInput,
    rawImageFile: File | null
  ) => Promise<{ bakery: Bakery; syncedToCloud: boolean }>;
}

const CIUDAD_BOLIVAR_SECTORS = [
  'Paseo Orinoco',
  'Vista Hermosa',
  'Casco Histórico',
  'Av. Táchira',
  'La Sabanita',
  'Agua Salada',
  'Los Próceres',
  'Perro Seco',
  'Marhuanta',
];

const ACCENT_PRESETS = [
  { label: 'Rojo Fuego CB', hex: '#F52D18' },
  { label: 'Dorado Corteza', hex: '#D97706' },
  { label: 'Ámbar Papelón', hex: '#EA580C' },
  { label: 'Carmesí Ahumado', hex: '#E11D48' },
  { label: 'Cobre Orinoco', hex: '#B45309' },
  { label: 'Esmeralda Selva', hex: '#10B981' },
];

/**
 * Compresses an uploaded image file via HTML5 canvas so it fits comfortably
 * in local preview and Firestore (<= 150KB) while also allowing raw File upload to Firebase Storage.
 */
async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen seleccionado.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
      img.onload = () => {
        const maxWidth = 480;
        const maxHeight = 360;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.fillStyle = '#09090B';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressed);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a custom artisanal facade/emblem image on canvas for quick previewing or testing.
 */
function generateArtisanalFacadeDataUrl(
  bakeryName: string,
  sector: string,
  portalCode: string,
  accentHex: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return COMPETITION_LOGO_PATH;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 480, 320);
  grad.addColorStop(0, '#09090B');
  grad.addColorStop(0.6, '#18181B');
  grad.addColorStop(1, accentHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 320);

  // Architectural facade arches (Ciudad Bolívar colonial style)
  ctx.strokeStyle = 'rgba(250, 248, 245, 0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const x = 65 + i * 135;
    ctx.beginPath();
    ctx.arc(x + 40, 210, 40, Math.PI, 0, false);
    ctx.lineTo(x + 80, 285);
    ctx.lineTo(x, 285);
    ctx.closePath();
    ctx.stroke();
  }

  // Top badge
  ctx.fillStyle = accentHex;
  ctx.fillRect(28, 26, 150, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`PORTAL ${portalCode || 'CB-NEW'}`, 40, 46);

  // Bakery Title
  ctx.fillStyle = '#FAF8F5';
  ctx.font = 'bold 26px sans-serif';
  const cleanTitle = (bakeryName || 'Nueva Panadería CB').slice(0, 26);
  ctx.fillText(cleanTitle, 28, 95);

  // Sector Subtitle
  ctx.fillStyle = '#FCD34D';
  ctx.font = '16px monospace';
  ctx.fillText(`FACHADA OFICIAL · ${(sector || 'Ciudad Bolívar').toUpperCase()}`, 28, 126);

  return canvas.toDataURL('image/jpeg', 0.85);
}

export const AdminBakeryModal: React.FC<AdminBakeryModalProps> = ({
  isOpen,
  editingBakery,
  existingBakeriesCount,
  currentUserUid,
  currentUserRole,
  onClose,
  onSwitchToAdminRole,
  onSaveBakery,
}) => {
  const nextSuggestedCode = `CB-0${existingBakeriesCount + 1}`;

  const [name, setName] = useState<string>('');
  const [sector, setSector] = useState<string>('Paseo Orinoco');
  const [address, setAddress] = useState<string>('');
  const [masterBaker, setMasterBaker] = useState<string>('');
  const [crustStyle, setCrustStyle] = useState<string>('Horno de Piedra y Leña');
  const [signatureRecipe, setSignatureRecipe] = useState<string>('');
  const [portalCode, setPortalCode] = useState<string>(nextSuggestedCode);
  const [accentHex, setAccentHex] = useState<string>('#F52D18');
  const [photoUrl, setPhotoUrl] = useState<string>(COMPETITION_LOGO_PATH);
  const [rawImageFile, setRawImageFile] = useState<File | null>(null);
  const [imageStatusMessage, setImageStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setSavedSuccess(null);
    setImageStatusMessage(null);
    setRawImageFile(null);

    if (editingBakery) {
      setName(editingBakery.name);
      setSector(editingBakery.sector);
      setAddress(editingBakery.address);
      setMasterBaker(editingBakery.masterBaker);
      setCrustStyle(editingBakery.crustStyle);
      setSignatureRecipe(editingBakery.signatureRecipe);
      setPortalCode(editingBakery.portalCode);
      setAccentHex(editingBakery.accentHex);
      setPhotoUrl(editingBakery.photoUrl || COMPETITION_LOGO_PATH);
    } else {
      setName('');
      setSector('Paseo Orinoco');
      setAddress('');
      setMasterBaker('');
      setCrustStyle('Horno de Piedra y Leña');
      setSignatureRecipe('');
      setPortalCode(`CB-0${existingBakeriesCount + 1}`);
      setAccentHex('#F52D18');
      setPhotoUrl(COMPETITION_LOGO_PATH);
    }
  }, [isOpen, editingBakery, existingBakeriesCount]);

  if (!isOpen) return null;

  const isAdmin = currentUserRole === 'admin';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage('Formato de imagen no válido. Usa JPG, PNG o WebP para el logo o fachada.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('La imagen supera el límite máximo de 5 MB de Firebase Storage.');
      return;
    }

    try {
      setRawImageFile(file);
      const compressedDataUrl = await compressImageFileToDataUrl(file);
      setPhotoUrl(compressedDataUrl);
      setImageStatusMessage(
        `Imagen "${file.name}" optimizada (${Math.round(compressedDataUrl.length / 1024)} KB) lista para el portal.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al procesar la imagen del local.'
      );
    }
  };

  const handleGenerateSampleFacade = () => {
    const sampleUrl = generateArtisanalFacadeDataUrl(name, sector, portalCode, accentHex);
    setPhotoUrl(sampleUrl);
    setRawImageFile(null);
    setImageStatusMessage(
      'Fachada / Emblema artesanal generado automáticamente para la vista previa del local.'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSavedSuccess(null);

    if (!isAdmin) {
      setErrorMessage(
        'Acceso denegado: Solo el Administrador (admin) puede agregar o editar panaderías.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSaveBakery(
        {
          existingBakeryId: editingBakery?.id,
          name,
          sector,
          address,
          masterBaker,
          crustStyle,
          signatureRecipe,
          portalCode,
          accentHex,
          photoUrl,
          actorUid: currentUserUid,
          actorRole: currentUserRole,
        },
        rawImageFile
      );

      setSavedSuccess(
        `Panadería "${result.bakery.name}" (${result.bakery.portalCode}) guardada exitosamente con su imagen de local y token QR inicial.`
      );
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo guardar la panadería.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-bakery-modal-title"
    >
      <div className="w-full max-w-3xl rounded-t-3xl md:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-zinc-950 px-6 py-5 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#F52D18]/15 border border-[#F52D18]/40 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#F52D18]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <span>CONTROL EXCLUSIVO ADMIN</span>
                <span aria-hidden="true">·</span>
                <span>PADRÓN OFICIAL CIUDAD BOLÍVAR</span>
              </div>
              <h2
                id="admin-bakery-modal-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wide truncate"
              >
                {editingBakery
                  ? `Editar Panadería: ${editingBakery.name}`
                  : 'Registrar Nueva Panadería en Competencia'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar gestión de panadería"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!isAdmin ? (
            <div className="rounded-2xl bg-red-950/30 border border-red-500/40 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-red-200">
                    Permiso Restringido por Rol (RBAC)
                  </h3>
                  <p className="text-sm text-red-300/90 leading-relaxed">
                    Tu rol activo actual es{' '}
                    <strong className="uppercase font-mono">{currentUserRole}</strong>. De acuerdo
                    con las reglas de seguridad de la competencia, únicamente el{' '}
                    <strong>Administrador (admin)</strong> puede agregar nuevas panaderías o
                    modificar el logo/fachada e información de un local.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onSwitchToAdminRole}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Activar Rol Administrador (Admin) Ahora</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Live Portal Card Preview + Image Uploader */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400">
                      1. Imagen del Logo o Fachada del Local + Vista Previa del Portal
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Sube una foto desde tu dispositivo (logo o fachada de la panadería) o genera un sello artesanal
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Rol verificado: ADMIN
                  </span>
                </div>

                {/* Live Preview Banner */}
                <div className="relative rounded-2xl bg-zinc-900 border border-zinc-800 p-4 overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 80% 25%, ${accentHex}, transparent 65%)`,
                    }}
                  />

                  <div className="relative z-10 flex items-center gap-4 min-w-0 w-full sm:w-auto">
                    {/* Uploaded Bakery Logo / Facade Preview */}
                    <div
                      className="w-24 h-24 sm:w-28 sm:h-24 rounded-xl bg-black border-2 overflow-hidden shrink-0 flex items-center justify-center shadow-lg"
                      style={{ borderColor: accentHex }}
                    >
                      <img
                        src={photoUrl || COMPETITION_LOGO_PATH}
                        alt="Vista previa de logo o fachada del local"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                        <span className="text-[#F52D18] font-bold">{portalCode || 'CB-NEW'}</span>
                        <span>·</span>
                        <span className="truncate">{sector}</span>
                      </div>
                      <div className="font-display text-2xl font-extrabold text-white truncate">
                        {name || 'Nombre de la Panadería'}
                      </div>
                      <div className="text-xs text-zinc-300 truncate">
                        Maestro: {masterBaker || 'Nombre del Maestro Panadero'}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {address || 'Dirección del local en Ciudad Bolívar'}
                      </div>
                    </div>
                  </div>

                  {/* Official Competition Logo Badge alongside the local image */}
                  <div className="relative z-10 shrink-0 flex items-center gap-2 bg-black/80 border border-zinc-800 rounded-xl px-3 py-2">
                    <img
                      src={COMPETITION_LOGO_PATH}
                      alt="Sello oficial competencia"
                      className="w-9 h-11 object-contain"
                    />
                    <div className="text-[10px] font-mono text-zinc-300 leading-tight">
                      <div className="text-white font-bold">SELLO OFICIAL</div>
                      <div>PORTAL INTEGRADO</div>
                    </div>
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span>Subir Foto de Logo o Fachada (JPG/PNG)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => void handleFileChange(e)}
                      className="hidden"
                      data-testid="admin-bakery-image-input"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateSampleFacade}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Generar Fachada / Emblema del Local</span>
                  </button>
                </div>

                {/* Optional Direct Image URL Input */}
                <div className="space-y-1">
                  <label
                    htmlFor="admin-bakery-photo-url"
                    className="block text-[11px] font-mono text-zinc-400"
                  >
                    O pega la URL directa de la imagen del logo / fachada (opcional):
                  </label>
                  <input
                    id="admin-bakery-photo-url"
                    type="text"
                    value={photoUrl.startsWith('data:') ? '' : photoUrl}
                    onChange={(e) => {
                      setPhotoUrl(e.target.value || COMPETITION_LOGO_PATH);
                      setRawImageFile(null);
                    }}
                    placeholder="https://... o sube un archivo arriba"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200"
                  />
                </div>

                {imageStatusMessage && (
                  <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{imageStatusMessage}</span>
                  </p>
                )}
              </div>

              {/* Section 2: Bakery Information Fields */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  2. Información Oficial del Local y Ficha Gastronómica
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label
                      htmlFor="admin-bakery-name"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Nombre de la Panadería *
                    </label>
                    <input
                      id="admin-bakery-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Panadería y Pastelería La Guayanesa"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-bakery-portal-code"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Código de Portal *
                    </label>
                    <input
                      id="admin-bakery-portal-code"
                      type="text"
                      required
                      value={portalCode}
                      onChange={(e) => setPortalCode(e.target.value.toUpperCase())}
                      placeholder="CB-07"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-bakery-sector"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Sector en Ciudad Bolívar *
                    </label>
                    <input
                      id="admin-bakery-sector"
                      list="cb-sectors-list"
                      required
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      placeholder="Ej. Paseo Orinoco, Vista Hermosa..."
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                    <datalist id="cb-sectors-list">
                      {CIUDAD_BOLIVAR_SECTORS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-bakery-address"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Dirección del Local *
                    </label>
                    <input
                      id="admin-bakery-address"
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ej. Av. 17 de Diciembre, Local 14, Ciudad Bolívar"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-bakery-master"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Maestro Panadero Responsable *
                    </label>
                    <input
                      id="admin-bakery-master"
                      type="text"
                      required
                      value={masterBaker}
                      onChange={(e) => setMasterBaker(e.target.value)}
                      placeholder="Ej. Maestro Hernán Landaeta"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-bakery-crust"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Estilo de Masa / Horneado *
                    </label>
                    <input
                      id="admin-bakery-crust"
                      type="text"
                      required
                      value={crustStyle}
                      onChange={(e) => setCrustStyle(e.target.value)}
                      placeholder="Ej. Masa Brioche con Barniz de Papelón"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-bakery-recipe"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Receta Insignia y Descripción del Pan de Jamón *
                  </label>
                  <textarea
                    id="admin-bakery-recipe"
                    rows={3}
                    required
                    value={signatureRecipe}
                    onChange={(e) => setSignatureRecipe(e.target.value)}
                    placeholder="Describe los ingredientes estrella: tipo de jamón ahumado, tocineta, aceitunas rellenas, pasas maceradas y técnica de fermentación..."
                    className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Accent Color Selector */}
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Color Acento del Portal Estético
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_PRESETS.map((preset) => {
                      const active = accentHex.toUpperCase() === preset.hex.toUpperCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setAccentHex(preset.hex)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                            active
                              ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-zinc-800'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {savedSuccess && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-300 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{savedSuccess}</span>
                </div>
              )}

              {/* Submit Actions */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="submit-admin-bakery-btn"
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] disabled:opacity-50 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Guardando Panadería...'
                      : editingBakery
                      ? 'Guardar Cambios del Local'
                      : 'Publicar Panadería y Generar QR'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
