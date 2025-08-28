import { useState } from "react";
import { toast } from "sonner";
import type { OrganizationPrompt, DefaultPrompt } from "@/types/prompts";

interface UsePromptsProps {
  initialPrompts: OrganizationPrompt[];
}

export function usePrompts({ initialPrompts }: UsePromptsProps) {
  const [prompts, setPrompts] = useState<OrganizationPrompt[]>(initialPrompts);
  const [selectedPrompt, setSelectedPrompt] =
    useState<OrganizationPrompt | null>(null);
  const [selectedDefaultPrompt, setSelectedDefaultPrompt] =
    useState<DefaultPrompt | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDefaultDialogOpen, setIsDefaultDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<OrganizationPrompt | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleViewPrompt = (prompt: OrganizationPrompt) => {
    setSelectedPrompt(prompt);
    setIsViewDialogOpen(true);
  };

  const handleViewDefaultPrompt = (prompt: DefaultPrompt) => {
    setSelectedDefaultPrompt(prompt);
    setIsDefaultDialogOpen(true);
  };

  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    setIsFormDialogOpen(true);
  };

  const handleEditPrompt = (prompt: OrganizationPrompt) => {
    setEditingPrompt(prompt);
    setIsFormDialogOpen(true);
  };

  const handleSavePrompt = (prompt: OrganizationPrompt) => {
    if (editingPrompt) {
      setPrompts((prev) => prev.map((p) => (p.id === prompt.id ? prompt : p)));
    } else {
      setPrompts((prev) => [prompt, ...prev]);
    }
  };

  const copyFromDefault = async (
    defaultPrompt: DefaultPrompt
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/organization/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcpServerId: defaultPrompt.mcpServer.id,
          name: `${defaultPrompt.name}_custom`,
          description: `Custom version of ${defaultPrompt.description}`,
          template: defaultPrompt.template,
          arguments: defaultPrompt.arguments,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPrompts((prev) => [data.prompt, ...prev]);
        toast.success("Prompt copied successfully!");
        return { success: true };
      } else {
        toast.error(data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error copying prompt:", error);
      toast.error("Failed to copy prompt");
      return { success: false, error: "Failed to copy prompt" };
    } finally {
      setIsLoading(false);
    }
  };

  const deletePrompt = async (
    promptId: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/organization/prompts/${promptId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setPrompts((prev) => prev.filter((p) => p.id !== promptId));
        toast.success("Prompt deleted successfully!");
        return { success: true };
      } else {
        toast.error(data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error("Failed to delete prompt");
      return { success: false, error: "Failed to delete prompt" };
    } finally {
      setIsLoading(false);
    }
  };

  const formatUserName = (
    user?: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
    } | null
  ) => {
    if (!user) return "System";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const closeDialogs = () => {
    setIsViewDialogOpen(false);
    setIsDefaultDialogOpen(false);
    setIsFormDialogOpen(false);
    setSelectedPrompt(null);
    setSelectedDefaultPrompt(null);
    setEditingPrompt(null);
  };

  return {
    prompts,
    selectedPrompt,
    selectedDefaultPrompt,
    editingPrompt,
    isViewDialogOpen,
    isDefaultDialogOpen,
    isFormDialogOpen,
    isLoading,

    handleViewPrompt,
    handleViewDefaultPrompt,
    handleCreatePrompt,
    handleEditPrompt,
    handleSavePrompt,
    copyFromDefault,
    deletePrompt,
    closeDialogs,

    formatUserName,

    setIsViewDialogOpen,
    setIsDefaultDialogOpen,
    setIsFormDialogOpen,
  };
}
