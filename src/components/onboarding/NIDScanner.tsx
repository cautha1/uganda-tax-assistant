import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, RefreshCw, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { processNIDImage, OCRResult, OCRProgress, getConfidenceLevel } from "@/lib/ocrUtils";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface NIDScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (result: { fullName: string; nin: string }) => void;
}

type ScannerState = 'camera' | 'captured' | 'processing' | 'result' | 'error';

export function NIDScanner({ open, onOpenChange, onScanComplete }: NIDScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<ScannerState>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState<OCRProgress>({ status: '', progress: 0 });
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      resetState();
    }
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError(t('nidScanner.cameraPermissionDenied'));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const resetState = () => {
    setState('camera');
    setCapturedImage(null);
    setResult(null);
    setError(null);
    setProgress({ status: '', progress: 0 });
  };

  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Get image as data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setState('captured');
    
    // Stop camera after capture to save resources
    stopCamera();
  }, []);

  const retakePhoto = () => {
    setCapturedImage(null);
    setState('camera');
    startCamera();
  };

  const processImage = async () => {
    if (!capturedImage) return;
    
    setState('processing');
    setError(null);
    
    try {
      const ocrResult = await processNIDImage(capturedImage, setProgress);
      setResult(ocrResult);
      
      if (!ocrResult.nin && !ocrResult.fullName) {
        setError(t('nidScanner.noDataExtracted'));
        setState('error');
      } else {
        setState('result');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(t('nidScanner.processingFailed'));
      setState('error');
    }
  };

  const confirmResult = () => {
    if (result) {
      onScanComplete({
        fullName: result.fullName || '',
        nin: result.nin || '',
      });
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onOpenChange(false);
  };

  const confidenceLevel = result ? getConfidenceLevel(result) : 'low';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('nidScanner.title')}
          </DialogTitle>
          <DialogDescription>
            {t('nidScanner.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* Camera View */}
          {state === 'camera' && (
            <div className="relative">
              {cameraError ? (
                <div className="aspect-[4/3] bg-muted flex items-center justify-center p-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{cameraError}</AlertDescription>
                  </Alert>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-[4/3] object-cover bg-black"
                  />
                  {/* Guide overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg" />
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                      <span className="bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                        {t('nidScanner.positionCard')}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Captured Image */}
          {(state === 'captured' || state === 'processing') && capturedImage && (
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Captured ID" 
                className="w-full aspect-[4/3] object-cover"
              />
              {state === 'processing' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="bg-background rounded-lg p-6 mx-4 w-full max-w-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm font-medium">{progress.status || t('nidScanner.processing')}</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      {progress.progress}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Result View */}
          {state === 'result' && result && (
            <div className="p-4 space-y-4">
              <Alert className={cn(
                confidenceLevel === 'high' && "border-green-500 bg-green-50 dark:bg-green-950",
                confidenceLevel === 'medium' && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
                confidenceLevel === 'low' && "border-red-500 bg-red-50 dark:bg-red-950"
              )}>
                <AlertDescription>
                  {confidenceLevel === 'high' && t('nidScanner.highConfidence')}
                  {confidenceLevel === 'medium' && t('nidScanner.mediumConfidence')}
                  {confidenceLevel === 'low' && t('nidScanner.lowConfidence')}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">{t('nidScanner.extractedName')}</p>
                  <p className="font-medium">
                    {result.fullName || <span className="text-muted-foreground italic">{t('nidScanner.notDetected')}</span>}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">{t('nidScanner.extractedNIN')}</p>
                  <p className="font-mono font-medium">
                    {result.nin || <span className="text-muted-foreground italic">{t('nidScanner.notDetected')}</span>}
                  </p>
                </div>
              </div>

              {(!result.nin || !result.fullName) && (
                <p className="text-sm text-muted-foreground text-center">
                  {t('nidScanner.partialResult')}
                </p>
              )}
            </div>
          )}

          {/* Error View */}
          {state === 'error' && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground text-center mt-4">
                {t('nidScanner.tryAgain')}
              </p>
            </div>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action buttons */}
        <div className="p-4 pt-2 flex gap-2">
          {state === 'camera' && (
            <>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button 
                className="flex-1" 
                onClick={captureImage}
                disabled={!!cameraError}
              >
                <Camera className="h-4 w-4 mr-2" />
                {t('nidScanner.capture')}
              </Button>
            </>
          )}

          {state === 'captured' && (
            <>
              <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('nidScanner.retake')}
              </Button>
              <Button className="flex-1" onClick={processImage}>
                <Check className="h-4 w-4 mr-2" />
                {t('nidScanner.processImage')}
              </Button>
            </>
          )}

          {state === 'processing' && (
            <Button variant="outline" className="flex-1" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('nidScanner.processing')}
            </Button>
          )}

          {state === 'result' && (
            <>
              <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('nidScanner.retake')}
              </Button>
              <Button 
                className="flex-1" 
                onClick={confirmResult}
                disabled={!result?.nin && !result?.fullName}
              >
                <Check className="h-4 w-4 mr-2" />
                {t('nidScanner.useResult')}
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={retakePhoto}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('nidScanner.tryAgainButton')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
