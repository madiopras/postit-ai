"use client";

import { useEffect, useRef } from "react";
import { Check, KeyRound, Mail, Send } from "lucide-react";

import {
  Button,
  ButtonLink,
} from "@/components/untitled/base/buttons/button";
import { Input } from "@/components/untitled/base/input/input";
import { TextArea } from "@/components/untitled/base/textarea/textarea";
import { LoadingIndicator } from "@/components/untitled/application/loading-indicator/loading-indicator";
import {
  Dialog,
  DialogTrigger,
  Modal,
  ModalDescription,
  ModalOverlay,
  ModalTitle,
} from "@/components/untitled/application/modals/modal";

interface SurfacePreviewProps {
  theme: "light" | "dark";
}

function SurfacePreview({ theme }: SurfacePreviewProps) {
  const isDark = theme === "dark";
  const formId = `${theme}-foundation-fields`;

  return (
    <section
      data-testid={`${theme}-surface`}
      data-ui-theme={theme}
      className="ui-surface rounded-ui-xl border border-border-secondary bg-bg-primary p-6 shadow-ui-sm"
    >
      <div className="mb-6">
        <p className="text-sm font-medium text-brand-text">
          {isDark ? "Dark mode" : "Light mode"}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-fg-primary">
          Untitled UI foundation
        </h2>
        <p className="mt-1 text-sm text-fg-tertiary">
          Primitive React Aria yang terisolasi dari UI produksi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button iconLeading={<Check />}>Simpan</Button>
        <Button variant="secondary">Sekunder</Button>
        <Button variant="tertiary">Tersier</Button>
        <Button variant="destructive">Hapus</Button>
        <Button isLoading>Memproses</Button>
        <ButtonLink href={`#${formId}`}>Lihat form</ButtonLink>
      </div>

      <div id={formId} className="mt-8 grid gap-5">
        <Input
          label="Email kerja"
          placeholder="nama@perusahaan.com"
          leadingIcon={<Mail />}
          autoComplete="email"
        />
        <Input
          label="Kata sandi"
          placeholder="Masukkan kata sandi"
          type="password"
          leadingIcon={<KeyRound />}
          autoComplete="current-password"
        />
        <Input
          label="Kode akses"
          defaultValue="kode-tidak-valid"
          isInvalid
          hint="Kode akses tidak dikenali. Periksa kembali nilainya."
        />
        <TextArea
          label="Catatan"
          placeholder="Tulis catatan singkat..."
          hint="Maksimal 200 piksel sebelum area menggulir."
        />
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-border-secondary pt-6">
        <LoadingIndicator size="sm" label="Memuat data" />

        {!isDark && (
          <DialogTrigger>
            <Button variant="secondary">Buka modal</Button>
            <ModalOverlay isDismissable>
              <Modal>
                <Dialog>
                  <ModalTitle>Konfirmasi foundation</ModalTitle>
                  <ModalDescription className="mt-2 block">
                    Modal memakai focus trap, Escape, backdrop dismissal, dan
                    restore focus dari React Aria.
                  </ModalDescription>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button slot="close" variant="secondary" autoFocus>
                      Batal
                    </Button>
                    <Button slot="close" iconTrailing={<Send />}>
                      Konfirmasi
                    </Button>
                  </div>
                </Dialog>
              </Modal>
            </ModalOverlay>
          </DialogTrigger>
        )}
      </div>
    </section>
  );
}

export function FoundationDemo() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    root?.setAttribute("data-hydrated", "true");

    return () => root?.removeAttribute("data-hydrated");
  }, []);

  return (
    <main
      ref={rootRef}
      className="min-h-screen bg-slate-100 px-4 py-10 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-slate-600">
            Development-only smoke surface
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            PostIt AI · Phase 1
          </h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <SurfacePreview theme="light" />
          <SurfacePreview theme="dark" />
        </div>
      </div>
    </main>
  );
}
