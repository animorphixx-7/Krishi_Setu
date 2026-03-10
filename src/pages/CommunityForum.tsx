import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare,
  Heart,
  Plus,
  Search,
  Filter,
  Send,
  Trash2,
  Clock,
  Users,
  TrendingUp,
  Sprout,
  Bug,
  HelpCircle,
  Lightbulb,
  Loader2,
  ImagePlus,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { value: "general", label: "General", icon: MessageSquare, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "tips", label: "Tips & Tricks", icon: Lightbulb, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "pest", label: "Pest & Disease", icon: Bug, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  { value: "crops", label: "Crops", icon: Sprout, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "market", label: "Market Talk", icon: TrendingUp, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { value: "help", label: "Help Needed", icon: HelpCircle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
];

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name?: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

const CommunityForum = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
    if (user) fetchUserLikes();
  }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel("forum-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts" }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      return;
    }

    // Fetch author names
    const userIds = [...new Set((data || []).map((p: any) => p.user_id))];
    const authorMap: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: profile } = await supabase.rpc("get_safe_profile", { profile_id: uid });
      if (profile) authorMap[uid] = (profile as any).full_name || "Farmer";
    }

    setPosts(
      (data || []).map((p: any) => ({
        ...p,
        author_name: authorMap[p.user_id] || "Farmer",
      }))
    );
    setLoading(false);
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("forum_likes")
      .select("post_id")
      .eq("user_id", user.id);
    if (data) setUserLikes(new Set(data.map((l: any) => l.post_id)));
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from("forum_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!data) return;

    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const authorMap: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: profile } = await supabase.rpc("get_safe_profile", { profile_id: uid });
      if (profile) authorMap[uid] = (profile as any).full_name || "Farmer";
    }

    setComments((prev) => ({
      ...prev,
      [postId]: data.map((c: any) => ({ ...c, author_name: authorMap[c.user_id] || "Farmer" })),
    }));
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast({ title: "Please login", description: "You need to be logged in to post.", variant: "destructive" });
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Missing fields", description: "Please fill in title and content.", variant: "destructive" });
      return;
    }

    setPosting(true);
    const { error } = await supabase.from("forum_posts").insert({
      user_id: user.id,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    } else {
      toast({ title: "Posted! 🎉", description: "Your post is now live." });
      setNewTitle("");
      setNewContent("");
      setNewCategory("general");
      setNewPostOpen(false);
      fetchPosts();
    }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({ title: "Please login", description: "You need to be logged in to like.", variant: "destructive" });
      return;
    }

    if (userLikes.has(postId)) {
      await supabase.from("forum_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setUserLikes((prev) => { const next = new Set(prev); next.delete(postId); return next; });
    } else {
      await supabase.from("forum_likes").insert({ post_id: postId, user_id: user.id });
      setUserLikes((prev) => new Set(prev).add(postId));
    }
    fetchPosts();
  };

  const handleComment = async (postId: string) => {
    if (!user || !newComment.trim()) return;
    setCommentLoading(true);
    const { error } = await supabase.from("forum_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });
    if (!error) {
      setNewComment("");
      fetchComments(postId);
      fetchPosts();
    }
    setCommentLoading(false);
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
    if (!error) {
      toast({ title: "Deleted", description: "Post removed." });
      fetchPosts();
    }
  };

  const toggleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) fetchComments(postId);
    }
  };

  const getCategoryMeta = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];

  const filteredPosts = posts.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Farmer Community
            </h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Share tips, ask questions, and connect with fellow farmers across India
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <Input
                    placeholder="Post title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    maxLength={200}
                  />
                  <Textarea
                    placeholder="Share your thoughts, tips, or questions..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={5}
                    maxLength={2000}
                  />
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreatePost} disabled={posting} className="w-full">
                    {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Publish Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge
            variant={selectedCategory === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Badge>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Badge
                key={c.value}
                variant={selectedCategory === c.value ? "default" : "outline"}
                className="cursor-pointer gap-1"
                onClick={() => setSelectedCategory(c.value)}
              >
                <Icon className="h-3 w-3" /> {c.label}
              </Badge>
            );
          })}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No discussions yet. Be the first to post!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const catMeta = getCategoryMeta(post.category);
              const CatIcon = catMeta.icon;
              const isExpanded = expandedPost === post.id;
              const liked = userLikes.has(post.id);

              return (
                <Card key={post.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-9 w-9 mt-0.5 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {(post.author_name || "F")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="text-base leading-snug line-clamp-2">
                            {post.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="font-medium">{post.author_name}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`shrink-0 gap-1 ${catMeta.color}`} variant="secondary">
                        <CatIcon className="h-3 w-3" /> {catMeta.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4 line-clamp-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1.5 ${liked ? "text-red-500" : "text-muted-foreground"}`}
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart className={`h-4 w-4 ${liked ? "fill-red-500" : ""}`} />
                        {post.likes_count}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={() => toggleExpand(post.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {post.comments_count} Comments
                      </Button>
                      {user?.id === post.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Comments section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {(comments[post.id] || []).map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarFallback className="bg-muted text-xs">
                                {(comment.author_name || "F")[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="bg-muted rounded-lg px-3 py-2 flex-1">
                              <div className="flex items-center gap-2 text-xs mb-1">
                                <span className="font-medium text-foreground">{comment.author_name}</span>
                                <span className="text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{comment.content}</p>
                            </div>
                          </div>
                        ))}

                        {user && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleComment(post.id);
                                }
                              }}
                              maxLength={500}
                            />
                            <Button
                              size="icon"
                              onClick={() => handleComment(post.id)}
                              disabled={commentLoading || !newComment.trim()}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityForum;
