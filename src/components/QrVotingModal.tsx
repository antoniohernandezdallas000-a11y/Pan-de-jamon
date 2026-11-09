import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  FileImage,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  X,
} from 'lucide-react';
import {
  Bakery,
  BLUEPRINT_CONSTRAINTS,
  COMPETITION_LOGO_PATH,
  QrToken,
  SURVEY_QUESTIONS,
  UserRole,
} from '../types/competition';
import {
  AtomicVoteInput,
  parseAndValidateQrPayload,
  validateStorageUpload,
} from '../utils/competitionLogic';

interface QrVotingModalProps {
  isOpen: boolean;
  initialBakeryId?: string | null;
  initialTokenCode?: string | null;
  bakeries: Bakery[];
  tokens: QrToken[];
  currentUserUid: string;
  currentUserAlias: string;
  currentUserRole: UserRole;
  onClose: () => void;
  onSubmitAtomicVote: (
    input: AtomicVoteInput,
    selectedFile: File | null
  ) => Promise<{ voteId: string; txHash: string; syncedToCloud: boolean }>;
}

export const QrVotingModal: React.FC<QrVotingModalProps> = ({
  isOpen,
  initialBakeryId,
  initialTokenCode,
  bakeries,
  tokens,
  currentUserUid,
  currentUserAlias,
  currentUserRole,
  onClose,
  onSubmitAtomicVote,
}) => {
  const [rawCodeInput, setRawCodeInput] = useState(initialTokenCode || '');
  const [cameraActive, setCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [videoResolution, setVideoResolution] = useState<string>('');

  const [voterAlias, setVoterAlias] = useState(currentUserAlias || 'Catador Ciudad Bolívar');
  const [q1DoughScore, setQ1DoughScore] = useState<number>(5);
  const [q2FillingScore, setQ2FillingScore] = useState<number>(5);
  const [q3OverallScore, setQ3OverallScore] = useState<number>(5);
  const [comment, setComment] = useState('');

  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [storageCheckMessage, setStorageCheckMessage] = useState<string | null>(null);
  const [storageCheckValid, setStorageCheckValid] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txReceipt, setTxReceipt] = useState<{
    voteId: string;
    txHash: string;
    bakeryName: string;
    tokenCode: string;
    syncedToCloud: boolean;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tokensRef = useRef<QrToken[]>(tokens);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    if (initialTokenCode) {
      setRawCodeInput(initialTokenCode);
    } else if (initialBakeryId) {
      const firstActive = tokens.find(
        (t) => t.bakeryId === initialBakeryId && t.status === 'active' && t.usedCount < t.maxUses
      );
      if (firstActive) {
        setRawCodeInput(firstActive.code);
      }
    }
  }, [initialBakeryId, initialTokenCode, tokens]);

  useEffect(() => {
    setVoterAlias(currentUserAlias || 'Catador Ciudad Bolívar');
  }, [currentUserAlias]);

  const stopCameraStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsStartingCamera(false);
    setVideoResolution('');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setSubmitError(null);
      setTxReceipt(null);
    }
    return () => stopCameraStream();
  }, [isOpen, stopCameraStream]);

  const startFrameScanLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrDecoded = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (qrDecoded && qrDecoded.data) {
            const validation = parseAndValidateQrPayload(qrDecoded.data, tokensRef.current);
            setRawCodeInput(validation.extractedCode || qrDecoded.data);
            setScanFeedback(
              `¡Código QR escaneado por cámara!: ${validation.extractedCode || qrDecoded.data}`
            );
            stopCameraStream();
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    };

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [stopCameraStream]);

  // Callback ref guarantees that the moment <video> mounts in DOM, srcObject is attached and play() runs
  const setVideoElementRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && streamRef.current) {
        if (node.srcObject !== streamRef.current) {
          node.srcObject = streamRef.current;
        }
        node.muted = true;
        node.setAttribute('playsinline', 'true');
        node.setAttribute('autoplay', 'true');
        void node
          .play()
          .then(() => {
            if (node.videoWidth && node.videoHeight) {
              setVideoResolution(`${node.videoWidth}×${node.videoHeight}px`);
            }
            startFrameScanLoop();
          })
          .catch(() => {
            startFrameScanLoop();
          });
      }
    },
    [startFrameScanLoop]
  );

  // Also ensure stream attaches if cameraActive state updates while videoRef is already mounted
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.muted = true;
      void video
        .play()
        .then(() => {
          if (video.videoWidth && video.videoHeight) {
            setVideoResolution(`${video.videoWidth}×${video.videoHeight}px`);
          }
          startFrameScanLoop();
        })
        .catch(() => {
          startFrameScanLoop();
        });
    }
  }, [cameraActive, startFrameScanLoop]);

  const startCameraScanner = async (overrideDeviceId?: string, overrideFacing?: 'environment' | 'user') => {
    stopCameraStream();
    setCameraError(null);
    setScanFeedback(null);
    setIsStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsStartingCamera(false);
      setCameraError(
        'El navegador no permite acceso a navigator.mediaDevices.getUserMedia. Asegúrate de abrir en HTTPS o usa "Leer Imagen QR" / selector de tokens.'
      );
      return;
    }

    const targetFacing = overrideFacing || facingMode;
    const targetDevice = overrideDeviceId !== undefined ? overrideDeviceId : selectedDeviceId;

    // Progressive fallback constraints so mobile rear, mobile front, and desktop webcams all open reliably
    const constraintCandidates: MediaStreamConstraints[] = [];
    if (targetDevice) {
      constraintCandidates.push({
        video: {
          deviceId: { exact: targetDevice },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    }
    constraintCandidates.push(
      {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      {
        video: { facingMode: targetFacing },
        audio: false,
      },
      {
        video: true,
        audio: false,
      }
    );

    let acquiredStream: MediaStream | null = null;
    let lastErr: unknown = null;

    for (const constraints of constraintCandidates) {
      try {
        acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (acquiredStream) break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!acquiredStream) {
      setIsStartingCamera(false);
      const errMsg = lastErr instanceof Error ? lastErr.message : 'Dispositivo no disponible';
      setCameraError(
        `No se pudo abrir la cámara del dispositivo (${errMsg}). Verifica que diste permiso de cámara al navegador o usa "Capturar / Leer Foto QR".`
      );
      return;
    }

    streamRef.current = acquiredStream;
    setCameraActive(true);
    setIsStartingCamera(false);

    // Enumerate available cameras so user can switch between frontal/trasera/USB
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoInputs);
      const currentTrack = acquiredStream.getVideoTracks()[0];
      const trackDeviceId = currentTrack?.getSettings?.()?.deviceId;
      if (trackDeviceId) {
        setSelectedDeviceId(trackDeviceId);
      }
    } catch {
      // Enumeration optional
    }
  };

  const handleSwitchCamera = () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex((c) => c.deviceId === selectedDeviceId);
      const nextCamera = availableCameras[(currentIndex + 1) % availableCameras.length];
      if (nextCamera) {
        setSelectedDeviceId(nextCamera.deviceId);
        void startCameraScanner(nextCamera.deviceId);
        return;
      }
    }
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    void startCameraScanner('', nextFacing);
  };

  const handleManualCaptureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      setScanFeedback('Esperando señal de video de la cámara...');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const decoded = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (decoded && decoded.data) {
      const parsed = parseAndValidateQrPayload(decoded.data, tokens);
      setRawCodeInput(parsed.extractedCode || decoded.data);
      setScanFeedback(`¡Código QR capturado del lente!: ${parsed.extractedCode || decoded.data}`);
      stopCameraStream();
    } else {
      setScanFeedback(
        'Fotograma analizado: acerca o centra un poco más el código QR frente al lente.'
      );
    }
  };

  const handleDecodeQrFromImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (decoded && decoded.data) {
          const parsed = parseAndValidateQrPayload(decoded.data, tokens);
          setRawCodeInput(parsed.extractedCode || decoded.data);
          setScanFeedback(`Imagen QR decodificada con éxito: ${parsed.extractedCode}`);
        } else {
          setScanFeedback('No se encontró un patrón QR en la imagen seleccionada.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const validationOutcome = parseAndValidateQrPayload(rawCodeInput, tokens);
  const targetBakery = validationOutcome.token
    ? bakeries.find((b) => b.id === validationOutcome.token?.bakeryId)
    : initialBakeryId
    ? bakeries.find((b) => b.id === initialBakeryId)
    : undefined;

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEvidenceFile(file);
    if (!file) {
      setStorageCheckMessage(null);
      setStorageCheckValid(true);
      return;
    }
    const check = validateStorageUpload(
      { name: file.name, sizeBytes: file.size, mimeType: file.type },
      currentUserUid,
      targetBakery?.id || 'bakery-paseo-orinoco',
      'vote_evidence'
    );
    setStorageCheckValid(check.valid);
    setStorageCheckMessage(`${check.reason} → Ruta: ${check.storagePath}`);
  };

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validationOutcome.ok || !validationOutcome.token) {
      setSubmitError(validationOutcome.error || 'Debes escanear o elegir un token QR válido.');
      return;
    }

    if (comment.trim().length < BLUEPRINT_CONSTRAINTS.COMMENT_MIN) {
      setSubmitError(
        `Por favor escribe un comentario de al menos ${BLUEPRINT_CONSTRAINTS.COMMENT_MIN} caracteres sobre el Pan de Jamón.`
      );
      return;
    }

    if (evidenceFile && !storageCheckValid) {
      setSubmitError('El archivo adjunto no cumple las reglas de seguridad de Firebase Storage.');
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await onSubmitAtomicVote(
        {
          tokenCode: validationOutcome.token.code,
          voterUid: currentUserUid,
          voterAlias: voterAlias.trim() || 'Catador Verificado',
          voterRole: currentUserRole,
          q1DoughScore,
          q2FillingScore,
          q3OverallScore,
          comment: comment.trim(),
        },
        evidenceFile
      );

      setTxReceipt({
        voteId: receipt.voteId,
        txHash: receipt.txHash,
        bakeryName: validationOutcome.token.bakeryName,
        tokenCode: validationOutcome.token.code,
        syncedToCloud: receipt.syncedToCloud,
      });
      setComment('');
      setEvidenceFile(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al procesar la transacción atómica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-voting-modal-title"
    >
      <div className="w-full max-w-2xl rounded-t-3xl md:rounded-3xl bg-[#FAF6F0] dark:bg-[#1E1917] border border-[#DDD0BC] dark:border-[#382E27] shadow-2xl overflow-hidden max-h-[94vh] flex flex-col text-[#2D241E] dark:text-[#F7F2EC]">
        {/* Modal Header */}
        <div className="p-6 md:px-8 bg-white dark:bg-[#251F1C] border-b border-[#E8DEC8] dark:border-[#332A24] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src={COMPETITION_LOGO_PATH}
              alt="Logo oficial El Concurso del Pan de Jamón"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-2xl object-contain bg-white dark:bg-[#1A1614] border border-[#DDD0BC] dark:border-[#382E27] p-1 shrink-0"
            />
            <div>
              <h2
                id="qr-voting-modal-title"
                className="font-display text-2xl font-bold tracking-wide text-[#2D241E] dark:text-[#FAF6F0]"
              >
                Vota por tu Pan de Jamón Favorito
              </h2>
              <p className="text-xs text-[#7A6B60] dark:text-[#A7988D]">
                Ingresa el código de tu mesa o usa la cámara para dejar tu opinión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full bg-[#FAF6F0] dark:bg-[#1A1614] hover:bg-[#EFE8DC] text-[#5C4F46] hover:text-[#2D241E] border border-[#DDD0BC] dark:border-[#382E27] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar cabina de votación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          {txReceipt ? (
            <div
              className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 p-6 space-y-4 text-center"
              data-testid="atomic-vote-receipt"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2D241E] dark:text-white">
                  ¡Muchas gracias por tu voto!
                </h3>
                <p className="text-sm text-[#57493E] dark:text-[#CBBDB2]">
                  Tu opinión para <strong>{txReceipt.bakeryName}</strong> ha sido registrada con éxito con el código{' '}
                  <strong className="font-mono">{txReceipt.tokenCode}</strong>. ¡Gracias por celebrar la tradición con nosotros!
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTxReceipt(null);
                    setRawCodeInput('');
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-white dark:bg-[#2A231F] border border-[#D5C7B2] text-[#2D241E] dark:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Calificar Otro Pan
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#C84B31] hover:bg-[#B33E26] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Ver Posiciones
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Step 1: Camera QR Scanner & Manipulable Token Deck */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="qr-token-code-input"
                    className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                  >
                    Paso 01 · Escaneo de Token QR (Cámara Directa o Selector)
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {!cameraActive ? (
                      <button
                        type="button"
                        disabled={isStartingCamera}
                        onClick={() => void startCameraScanner()}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Camera className="w-4 h-4" />
                        <span>
                          {isStartingCamera ? 'Abriendo Cámara...' : 'Activar Cámara QR'}
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Cambiar Lente</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCameraStream}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CameraOff className="w-3.5 h-3.5" />
                          <span>Detener Cámara</span>
                        </button>
                      </>
                    )}

                    {/* Direct Mobile Camera Capture / Image File Decoder Fallback */}
                    <label className="min-h-[42px] px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                      <FileImage className="w-3.5 h-3.5 text-amber-500" />
                      <span>Foto / Imagen QR</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleDecodeQrFromImageFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Always-ready hidden canvas for frame decoding */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Live Camera Viewport */}
                {cameraActive && (
                  <div
                    className="relative rounded-2xl overflow-hidden bg-black border-2 border-[#F52D18] aspect-video flex flex-col justify-between"
                    data-testid="live-camera-viewport"
                  >
                    <video
                      ref={setVideoElementRef}
                      onLoadedMetadata={(e) => {
                        const v = e.currentTarget;
                        void v.play().catch(() => {});
                        if (v.videoWidth && v.videoHeight) {
                          setVideoResolution(`${v.videoWidth}×${v.videoHeight}px`);
                        }
                      }}
                      className="w-full h-full object-cover"
                      playsInline
                      autoPlay
                      muted
                    />

                    {/* Top Camera Telemetry Bar */}
                    <div className="relative z-10 p-3 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent text-xs font-mono text-white">
                      <span className="text-emerald-400 font-bold">
                        LENTE ACTIVO {videoResolution ? `· ${videoResolution}` : ''}
                      </span>
                      {availableCameras.length > 1 && (
                        <select
                          aria-label="Seleccionar dispositivo de cámara"
                          value={selectedDeviceId}
                          onChange={(e) => {
                            setSelectedDeviceId(e.target.value);
                            void startCameraScanner(e.target.value);
                          }}
                          className="bg-zinc-900/90 border border-zinc-700 text-white text-[11px] rounded-lg px-2 py-1"
                        >
                          {availableCameras.map((cam, idx) => (
                            <option key={cam.deviceId || idx} value={cam.deviceId}>
                              {cam.label || `Cámara ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Center QR Aiming Reticle */}
                    <div className="absolute inset-10 sm:inset-14 border-2 border-dashed border-[#F52D18]/90 rounded-2xl pointer-events-none flex items-center justify-center">
                      <div className="w-full h-0.5 bg-[#F52D18]/80 shadow-[0_0_12px_#F52D18]" />
                    </div>

                    {/* Bottom Camera Controls */}
                    <div className="relative z-10 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono text-zinc-200">
                        Apunta al código QR de la panadería...
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleManualCaptureFrame}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F52D18] hover:bg-[#d92310] text-white text-xs font-bold cursor-pointer"
                        >
                          Capturar Fotograma Ahora
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
                    <p>{cameraError}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const firstActive = tokens.find(
                            (t) => t.status === 'active' && t.usedCount < t.maxUses
                          );
                          if (firstActive) {
                            setRawCodeInput(firstActive.code);
                            setCameraError(null);
                            setScanFeedback(
                              `Token QR cargado mediante lector asistido: ${firstActive.code}`
                            );
                          }
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-200 font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simular Lectura de Token QR Activo</span>
                      </button>
                    </div>
                  </div>
                )}

                {scanFeedback && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 font-mono">
                    {scanFeedback}
                  </p>
                )}

                {/* Quick Token Selector Deck */}
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block">
                    Tokens QR disponibles en mesa (toca uno para cargarlo en el lector):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {tokens.map((t) => {
                      const isSelected = rawCodeInput.trim().toUpperCase() === t.code;
                      const isUsable = t.status === 'active' && t.usedCount < t.maxUses;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setRawCodeInput(t.code)}
                          className={`min-h-[40px] px-4 py-1.5 rounded-full font-mono text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#F52D18] to-amber-600 text-white border-transparent shadow-md'
                              : isUsable
                              ? 'bg-zinc-900 text-zinc-200 border-white/10 hover:border-amber-500/40'
                              : 'bg-zinc-900/40 text-zinc-500 border-white/5'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.code}</span>
                          <span className="text-[10px] opacity-80">
                            ({t.usedCount}/{t.maxUses} · {t.status.toUpperCase()})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual / Scanned Token Code Input */}
                <div className="space-y-2">
                  <input
                    id="qr-token-code-input"
                    type="text"
                    value={rawCodeInput}
                    onChange={(e) => setRawCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ej. CB-ORINOCO-101"
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 font-mono text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                  />

                  {/* Live Token Validation Banner */}
                  {rawCodeInput.trim() && (
                    <div
                      className={`rounded-xl p-3 text-xs flex items-start gap-2.5 border ${
                        validationOutcome.ok
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                      }`}
                      data-testid="qr-token-validation-status"
                    >
                      {validationOutcome.ok ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                      )}
                      <div>
                        {validationOutcome.ok && validationOutcome.token ? (
                          <>
                            <strong>Token QR Verificado:</strong> {validationOutcome.token.code} →{' '}
                            <strong>{validationOutcome.token.bakeryName}</strong> (
                            {validationOutcome.token.batchLabel} · Usos:{' '}
                            {validationOutcome.token.usedCount}/{validationOutcome.token.maxUses})
                          </>
                        ) : (
                          <span>{validationOutcome.error}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: 3-Question Post-Tasting Star Survey */}
              <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Paso 02 · Encuesta Oficial de 3 Preguntas (Escala 1 a 5 Estrellas)
                  </h3>
                  <span className="text-xs font-mono text-amber-500 tabular-nums">
                    Promedio actual: {((q1DoughScore + q2FillingScore + q3OverallScore) / 3).toFixed(2)} ★
                  </span>
                </div>

                <div className="space-y-3">
                  {SURVEY_QUESTIONS.map((q, idx) => {
                    const currentVal =
                      idx === 0 ? q1DoughScore : idx === 1 ? q2FillingScore : q3OverallScore;
                    const setVal =
                      idx === 0 ? setQ1DoughScore : idx === 1 ? setQ2FillingScore : setQ3OverallScore;

                    return (
                      <div
                        key={q.key}
                        className="rounded-2xl bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {q.number}. {q.title}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{q.subtitle}</p>
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          role="group"
                          aria-label={q.title}
                        >
                          {[1, 2, 3, 4, 5].map((starValue) => {
                            const active = starValue <= currentVal;
                            return (
                              <button
                                key={starValue}
                                type="button"
                                onClick={() => setVal(starValue)}
                                aria-label={`Calificar pregunta ${q.number} con ${starValue} estrellas`}
                                className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                                  active
                                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400'
                                }`}
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    active ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Voter Alias, Tasting Comment & Firebase Storage Photo Evidence */}
              <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="voter-alias-input"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      Nombre o Alias de Catador
                    </label>
                    <input
                      id="voter-alias-input"
                      type="text"
                      value={voterAlias}
                      onChange={(e) => setVoterAlias(e.target.value)}
                      maxLength={80}
                      required
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="evidence-upload-input"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      Evidencia Fotográfica (Firebase Storage · Opcional)
                    </label>
                    <label className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#F52D18] text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-between gap-2 cursor-pointer">
                      <span className="truncate">
                        {evidenceFile
                          ? `${evidenceFile.name} (${(evidenceFile.size / 1024).toFixed(0)} KB)`
                          : 'Subir foto del corte de Pan de Jamón (JPEG/PNG/WebP <= 5MB)'}
                      </span>
                      <Upload className="w-4 h-4 text-[#F52D18] shrink-0" />
                      <input
                        id="evidence-upload-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleEvidenceFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {storageCheckMessage && (
                  <div
                    className={`rounded-xl p-3 text-xs font-mono border flex items-center gap-2 ${
                      storageCheckValid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{storageCheckMessage}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="tasting-comment-input"
                      className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                    >
                      Comentario de Cata y Notas Sensoriales (Obligatorio)
                    </label>
                    <span className="text-xs font-mono text-zinc-400 tabular-nums">
                      {comment.length}/{BLUEPRINT_CONSTRAINTS.COMMENT_MAX}
                    </span>
                  </div>
                  <textarea
                    id="tasting-comment-input"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={BLUEPRINT_CONSTRAINTS.COMMENT_MAX}
                    placeholder="Describe el horneado de la masa, el punto del melado, el ahumado del jamón y las aceitunas..."
                    className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#F52D18]"
                  />
                </div>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-[#F52D18] hover:bg-[#d92310] disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Ejecutando Transacción Atómica...'
                      : 'Confirmar Voto Atómico en Firestore'}
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
