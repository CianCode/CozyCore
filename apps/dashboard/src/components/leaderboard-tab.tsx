"use client";

import type { DiscordRole, LeaderboardUser, LevelRole } from "@cozycore/types";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Crown,
  Loader2,
  Medal,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trophy,
  User,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getRoleColorHex } from "@/components/discord-markdown-preview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type LeaderboardTabProps = {
  guildId: string;
  discordRoles: DiscordRole[];
  levelRoles: LevelRole[];
};

type LeaderboardData = {
  users: LeaderboardUser[];
  total: number;
  page: number;
  pageSize: number;
};

type SelectedUser = LeaderboardUser & {
  nextRole?: LevelRole | null;
  xpToNextRole?: number;
};

const PAGE_SIZE = 20;

export function LeaderboardTab({
  guildId,
  discordRoles,
  levelRoles,
}: LeaderboardTabProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Add user modal state
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState("");
  const [addUserResults, setAddUserResults] = useState<
    Array<{
      id: string;
      username: string;
      displayName: string;
      avatar: string | null;
    }>
  >([]);
  const [addUserSearching, setAddUserSearching] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [initialXp, setInitialXp] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString(),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const res = await fetch(`/api/guilds/${guildId}/leaderboard?${params}`);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [guildId, page, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  // Search guild members for adding
  const searchGuildMembers = async (query: string) => {
    if (!query.trim()) {
      setAddUserResults([]);
      return;
    }

    setAddUserSearching(true);
    try {
      const res = await fetch(
        `/api/guilds/${guildId}/members?search=${encodeURIComponent(query)}`
      );
      const json = await res.json();
      if (json.success) {
        setAddUserResults(json.data);
      }
    } catch (error) {
      console.error("Failed to search members:", error);
    } finally {
      setAddUserSearching(false);
    }
  };

  // Debounced search for add user
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGuildMembers(addUserSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [addUserSearch]);

  // Add user to leaderboard
  const handleAddUser = async (userId: string) => {
    setAddingUser(userId);
    try {
      const res = await fetch(`/api/guilds/${guildId}/leaderboard/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: initialXp,
          reason: "Added to leaderboard via dashboard",
        }),
      });

      const json = await res.json();
      if (json.success) {
        await fetchLeaderboard();
        setAddUserOpen(false);
        setAddUserSearch("");
        setAddUserResults([]);
        setInitialXp(0);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setAddingUser(null);
    }
  };

  // Open user modal
  const openUserModal = (user: LeaderboardUser) => {
    // Find next role
    const sortedRoles = [...levelRoles].sort(
      (a, b) => a.xpRequired - b.xpRequired
    );
    const nextRole = sortedRoles.find((r) => r.xpRequired > user.totalXp);
    const xpToNextRole = nextRole
      ? nextRole.xpRequired - user.totalXp
      : undefined;

    setSelectedUser({ ...user, nextRole, xpToNextRole });
    setAdjustmentAmount(0);
    setAdjustmentReason("");
  };

  // Close modal
  const closeModal = () => {
    setSelectedUser(null);
    setAdjustmentAmount(0);
    setAdjustmentReason("");
  };

  // Handle XP adjustment
  const handleAdjustXP = async () => {
    if (!selectedUser || adjustmentAmount === 0) return;

    setAdjusting(true);
    try {
      const res = await fetch(
        `/api/guilds/${guildId}/leaderboard/${selectedUser.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: adjustmentAmount,
            reason: adjustmentReason || undefined,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        // Refresh leaderboard after adjustment
        await fetchLeaderboard();
        closeModal();
      }
    } catch (error) {
      console.error("Failed to adjust XP:", error);
    } finally {
      setAdjusting(false);
    }
  };

  // Get role name from roleId
  const getRoleName = (roleId: string | null) => {
    if (!roleId) return null;
    return discordRoles.find((r) => r.id === roleId)?.name ?? null;
  };

  // Get role color
  const getRoleColor = (roleId: string | null) => {
    if (!roleId) return;
    const role = discordRoles.find((r) => r.id === roleId);
    return role ? getRoleColorHex(role.color) : undefined;
  };

  // Get rank badge styling
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bgClass:
            "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50",
          icon: <Crown className="h-5 w-5 text-yellow-500" />,
          badgeClass: "bg-yellow-500 text-yellow-950",
        };
      case 2:
        return {
          bgClass:
            "bg-gradient-to-r from-slate-300/20 to-gray-400/20 border-slate-400/50",
          icon: <Medal className="h-5 w-5 text-slate-400" />,
          badgeClass: "bg-slate-400 text-slate-950",
        };
      case 3:
        return {
          bgClass:
            "bg-gradient-to-r from-orange-600/20 to-amber-700/20 border-orange-600/50",
          icon: <Award className="h-5 w-5 text-orange-600" />,
          badgeClass: "bg-orange-600 text-orange-950",
        };
      default:
        return {
          bgClass: "",
          icon: null,
          badgeClass: "bg-muted text-muted-foreground",
        };
    }
  };

  // Calculate preview XP
  const getPreviewXp = () => {
    if (!selectedUser) return 0;
    return Math.max(0, selectedUser.totalXp + adjustmentAmount);
  };

  // Find what role they'd have after adjustment
  const getPreviewRole = () => {
    const previewXp = getPreviewXp();
    const sortedRoles = [...levelRoles].sort(
      (a, b) => a.xpRequired - b.xpRequired
    );
    const qualified = sortedRoles.filter((r) => r.xpRequired <= previewXp);
    return qualified.at(-1) ?? null;
  };

  // Total pages
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton className="h-16 w-full" key={`skeleton-${i}`} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                XP Leaderboard
              </CardTitle>
              <CardDescription>
                {data?.total ?? 0} members with XP in this server
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAddUserOpen(true)}
                size="sm"
                variant="outline"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
              <Button
                disabled={refreshing}
                onClick={handleRefresh}
                size="sm"
                variant="outline"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full rounded-lg border bg-background py-2 pr-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name..."
              type="text"
              value={search}
            />
          </div>

          {/* Leaderboard Table */}
          <div className="space-y-2">
            {data?.users.length ? (
              data.users.map((user) => {
                const rankStyle = getRankStyle(user.rank);
                const roleName = getRoleName(user.currentRoleId);
                const roleColor = getRoleColor(user.currentRoleId);

                return (
                  <button
                    className={`flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${rankStyle.bgClass}`}
                    key={user.userId}
                    onClick={() => openUserModal(user)}
                    type="button"
                  >
                    {/* Rank */}
                    <div className="flex w-10 items-center justify-center">
                      {rankStyle.icon ?? (
                        <Badge
                          className={rankStyle.badgeClass}
                          variant="secondary"
                        >
                          #{user.rank}
                        </Badge>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        alt={user.displayName}
                        src={
                          user.avatar
                            ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`
                            : undefined
                        }
                      />
                      <AvatarFallback>
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {user.displayName}
                      </div>
                      <div className="truncate text-muted-foreground text-sm">
                        @{user.username}
                      </div>
                    </div>

                    {/* Current Role */}
                    <div className="hidden sm:block">
                      {roleName ? (
                        <Badge
                          style={{
                            borderColor: roleColor,
                            color: roleColor,
                          }}
                          variant="outline"
                        >
                          {roleName}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No role
                        </span>
                      )}
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <div className="font-bold text-primary">
                        {user.totalXp.toLocaleString()} XP
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="mb-4 h-12 w-12 opacity-50" />
                <p>No members found</p>
                {debouncedSearch && (
                  <p className="text-sm">Try a different search term</p>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-muted-foreground text-sm">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  size="sm"
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  size="sm"
                  variant="outline"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User XP Adjustment Modal */}
      <Dialog
        onOpenChange={(open) => !open && closeModal()}
        open={!!selectedUser}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  alt={selectedUser?.displayName}
                  src={
                    selectedUser?.avatar
                      ? `https://cdn.discordapp.com/avatars/${selectedUser.userId}/${selectedUser.avatar}.png`
                      : undefined
                  }
                />
                <AvatarFallback>
                  {selectedUser?.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selectedUser?.displayName}</div>
                <div className="font-normal text-muted-foreground text-sm">
                  @{selectedUser?.username}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Adjust XP for this member. Role changes will be applied
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-muted-foreground">Current XP</Label>
                <div className="font-bold text-2xl">
                  {selectedUser?.totalXp.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground">Current Role</Label>
                <div>
                  {selectedUser?.currentRoleId ? (
                    <Badge
                      style={{
                        borderColor: getRoleColor(selectedUser.currentRoleId),
                        color: getRoleColor(selectedUser.currentRoleId),
                      }}
                      variant="outline"
                    >
                      {getRoleName(selectedUser.currentRoleId)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Next Role Progress */}
            {selectedUser?.nextRole && (
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Next Role</span>
                  <Badge
                    style={{
                      borderColor: getRoleColor(selectedUser.nextRole.roleId),
                      color: getRoleColor(selectedUser.nextRole.roleId),
                    }}
                    variant="outline"
                  >
                    {getRoleName(selectedUser.nextRole.roleId)}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  {selectedUser.xpToNextRole?.toLocaleString()} XP needed
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(100, (selectedUser.totalXp / selectedUser.nextRole.xpRequired) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* XP Adjustment Controls */}
            <div className="space-y-4">
              <Label>Adjust XP</Label>
              <div className="flex items-center gap-2">
                <Button
                  disabled={adjusting}
                  onClick={() => setAdjustmentAmount((a) => a - 100)}
                  size="icon"
                  variant="outline"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <input
                  className="flex-1 rounded-lg border bg-background px-4 py-2 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={adjusting}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  type="number"
                  value={adjustmentAmount}
                />
                <Button
                  disabled={adjusting}
                  onClick={() => setAdjustmentAmount((a) => a + 100)}
                  size="icon"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick adjustment buttons */}
              <div className="flex flex-wrap gap-2">
                {[-500, -100, -50, 50, 100, 500].map((val) => (
                  <Button
                    disabled={adjusting}
                    key={val}
                    onClick={() => setAdjustmentAmount((a) => a + val)}
                    size="sm"
                    variant={val > 0 ? "default" : "destructive"}
                  >
                    {val > 0 ? `+${val}` : val}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {adjustmentAmount !== 0 && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <Label className="text-muted-foreground text-sm">Preview</Label>
                <div className="flex items-center justify-between">
                  <span>New XP:</span>
                  <span className="font-bold">
                    {getPreviewXp().toLocaleString()}
                  </span>
                </div>
                {(() => {
                  const previewRole = getPreviewRole();
                  const currentRoleId = selectedUser?.currentRoleId;
                  if (previewRole?.roleId !== currentRoleId) {
                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-yellow-600">
                          Role will change to:
                        </span>
                        {previewRole ? (
                          <Badge
                            style={{
                              borderColor: getRoleColor(previewRole.roleId),
                              color: getRoleColor(previewRole.roleId),
                            }}
                            variant="outline"
                          >
                            {getRoleName(previewRole.roleId)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No role</span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <input
                className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={adjusting}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="e.g., Event reward, Manual correction..."
                type="text"
                value={adjustmentReason}
              />
            </div>
          </div>

          <DialogFooter>
            <Button disabled={adjusting} onClick={closeModal} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={adjustmentAmount === 0 || adjusting}
              onClick={handleAdjustXP}
            >
              {adjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adjustmentAmount >= 0 ? "Add" : "Remove"}{" "}
              {Math.abs(adjustmentAmount)} XP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Dialog
        onOpenChange={(open) => {
          setAddUserOpen(open);
          if (!open) {
            setAddUserSearch("");
            setAddUserResults([]);
            setInitialXp(0);
          }
        }}
        open={addUserOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add User to Leaderboard
            </DialogTitle>
            <DialogDescription>
              Search for a server member to add to the XP leaderboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg border bg-background py-2 pr-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={(e) => setAddUserSearch(e.target.value)}
                placeholder="Search by username..."
                type="text"
                value={addUserSearch}
              />
            </div>

            {/* Initial XP Setting */}
            <div className="space-y-2">
              <Label>Initial XP (optional)</Label>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  min={0}
                  onChange={(e) =>
                    setInitialXp(Math.max(0, Number(e.target.value)))
                  }
                  type="number"
                  value={initialXp}
                />
                <div className="flex gap-1">
                  {[0, 100, 500, 1000].map((val) => (
                    <Button
                      key={val}
                      onClick={() => setInitialXp(val)}
                      size="sm"
                      variant={initialXp === val ? "default" : "outline"}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {addUserSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : addUserResults.length === 0 && addUserSearch ? (
                <div className="py-8 text-center text-muted-foreground">
                  <User className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No members found</p>
                </div>
              ) : (
                addUserResults.map((member) => {
                  const existsInLeaderboard = data?.users.some(
                    (u) => u.userId === member.id
                  );
                  return (
                    <div
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
                      key={member.id}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          alt={member.displayName}
                          src={
                            member.avatar
                              ? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`
                              : undefined
                          }
                        />
                        <AvatarFallback>
                          {member.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {member.displayName}
                        </div>
                        <div className="truncate text-muted-foreground text-sm">
                          @{member.username}
                        </div>
                      </div>
                      {existsInLeaderboard ? (
                        <Badge variant="secondary">Already added</Badge>
                      ) : (
                        <Button
                          disabled={addingUser === member.id}
                          onClick={() => handleAddUser(member.id)}
                          size="sm"
                        >
                          {addingUser === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="mr-1 h-4 w-4" />
                              Add
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {!addUserSearch && (
              <div className="py-4 text-center text-muted-foreground text-sm">
                Start typing to search for server members
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
