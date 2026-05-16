import { useQuery } from "@tanstack/react-query";
import { apiClient, type ApiResponse } from "@/lib/api-client";

export type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  openTaskCount: number;
  activityStatus: "ACTIVE" | "IDLE";
};

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ members: TeamMember[] }>>("/team");
      return response.data.data.members;
    },
    refetchInterval: 15000,
    staleTime: 30000,
    placeholderData: (previous) => previous,
  });
}
