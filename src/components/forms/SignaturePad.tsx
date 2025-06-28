
"use client";

import * as React from "react";
import SignatureCanvas from 'react-signature-canvas';
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSignatureEnd: (signature: string) => void;
  signatureRef: React.RefObject<SignatureCanvas>;
  className?: string;
}

export default function SignaturePad({ onSignatureEnd, signatureRef, className }: SignaturePadProps) {

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      onSignatureEnd(""); // Notify parent that signature is cleared
    }
  };
  
  const handleEnd = () => {
     if (signatureRef.current && !signatureRef.current.isEmpty()) {
       // Get signature as a base64 string (PNG format)
       const signatureDataUrl = signatureRef.current.toDataURL();
       onSignatureEnd(signatureDataUrl);
     } else {
        onSignatureEnd("");
     }
  };

  return (
    <div className="relative w-full aspect-[2/1] border border-dashed rounded-md bg-muted/50">
      <SignatureCanvas
        ref={signatureRef}
        penColor='black'
        canvasProps={{ className: "w-full h-full rounded-md" }}
        onEnd={handleEnd}
      />
      <div className="absolute top-2 right-2">
        <Button type="button" variant="outline" size="icon" onClick={handleClear} aria-label="Limpiar firma">
            <Eraser className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
