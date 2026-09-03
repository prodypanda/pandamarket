import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PromptDialog } from '../components/ui/PromptDialog';

describe('Modal Primitive Component', () => {
  it('renders correctly when open with title and description', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Title" subtitle="Test Subtitle">
        <p>Modal Content Inside</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Modal Content Inside')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Hidden Content</p>
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Test">
        <button type="button">Focusable</button>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Close Button Test">
        <div>Content</div>
      </Modal>,
    );

    const closeBtn = screen.getByRole('button', { name: /fermer/i });
    await userEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('supports RTL layout direction', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="RTL Dialog" dir="rtl">
        <div>RTL Content</div>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('dir', 'rtl');
  });
});

describe('ConfirmDialog Component', () => {
  it('renders danger variant with title and description', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Supprimer le produit"
        description="Cette action est irréversible."
        variant="danger"
        confirmLabel="Supprimer"
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Supprimer le produit')).toBeInTheDocument();
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
  });

  it('executes onConfirm when confirmed', async () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={handleConfirm}
        title="Confirmation"
        description="Confirmez-vous l'action ?"
        confirmLabel="Confirmer"
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirmer' });
    await userEvent.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading is true', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {}}
        title="Suppression en cours"
        description="Veuillez patienter."
        loading={true}
        confirmLabel="Supprimer"
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Supprimer' });
    expect(confirmButton).toBeDisabled();
    const cancelButton = screen.getByRole('button', { name: 'Annuler' });
    expect(cancelButton).toBeDisabled();
  });
});

describe('PromptDialog Component', () => {
  it('renders with textarea and character counter', () => {
    render(
      <PromptDialog
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        title="Motif d'annulation"
        description="Veuillez expliquer la raison."
        inputType="textarea"
        maxLength={500}
        placeholder="Raison..."
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText("Motif d'annulation")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Raison...')).toBeInTheDocument();
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('updates character count on input and submits typed value', async () => {
    const handleSubmit = vi.fn();
    render(
      <PromptDialog
        isOpen={true}
        onClose={() => {}}
        onSubmit={handleSubmit}
        title="Motif"
        inputType="textarea"
        maxLength={500}
        placeholder="Entrez le motif"
      />,
    );

    const textarea = screen.getByPlaceholderText('Entrez le motif');
    await userEvent.type(textarea, 'Rupture de stock fournisseur');

    expect(screen.getByText('28/500')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'Confirmer' });
    await userEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith('Rupture de stock fournisseur');
  });

  it('displays error message when provided', () => {
    render(
      <PromptDialog
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        title="Erreur Test"
        errorMessage="Échec de l'annulation"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Échec de l'annulation");
  });
});
