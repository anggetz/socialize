import { CaraouselHome } from "@/components/carousel-home";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useVisibility } from "@/hooks/useVisibility";
import { TopicComment } from "@/models/topic_comment";
import { serviceTopic } from "@/services/topic";
import { serviceTopicComment } from "@/services/topic_comment";
import { key } from "localforage";



import { useEffect, useRef, useState } from "react";

const TopicList = () => {
    const [ref, isVisible] = useVisibility();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openComment, setOpenComment] = useState<{ [id: number]: boolean }>({});
    const [comments, setComments] = useState<{ [id: number]: TopicComment[] }>({});
    const [newComment, setNewComment] = useState<{ [id: number]: string }>({});
    const wsConnections = useRef<{ [id: number]: WebSocket }>({}); // ✅ WebSocket storage
    const topicRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const [visibleTopics, setVisibleTopics] = useState<{ [key: number]: boolean }>({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const service = new serviceTopic();

    const getTopics = async (currPage) => {
        try {
            const response = await service.Get(1, currPage*3);
            setTopics(response.data);

            if (response.data.length < currPage*3) setHasMore(false);

            for (const t of response.data) {
                await loadLikeData(t.id);
            }
        } catch (err) {
            console.error("Failed to fetch topics:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        getTopics(nextPage);
    };

    const handleDeleteTopic = async (id: number) => {
        try {
            await service.Delete(id);
            setTopics(prev => prev.filter(t => t.id !== id));
            delete wsConnections.current[id]; // Just in case
        } catch (err) {
            console.error("Failed to delete topic:", err);
        }
    };

    const loadComments = async (topicId: number) => {
        try {
            const res = await new serviceTopicComment().GetByTopicId(topicId);
            setComments(prev => ({ ...prev, [topicId]: res.data }));
        } catch (err) {
            console.error("Failed to fetch comments:", err);
        }
    };

    const handleToggleComment = async (id: number) => {
        const toggled = !openComment[id];
        setOpenComment(prev => ({ ...prev, [id]: toggled }));

        if (toggled) {
            await loadComments(id);
            // openWSConnection(id); // ✅ open WS
        } else {
            // closeWSConnection(id); // ✅ close WSs
        }
    };

    const openWSConnection = (topicId: number) => {
        if (wsConnections.current[topicId]) return;

        const ws = new WebSocket(`ws://localhost:3000/ws/${topicId}`);
        ws.onopen = () => console.log(`WebSocket opened for topic ${topicId}`);
        ws.onmessage = (event) => {
            const newEvent = JSON.parse(event.data);

            if (newEvent.Action == 'update-comment') {
                const newCommentData = newEvent.Data;
                console.log("Received WS comment:", newCommentData);

                // Assuming the backend sends a new comment
                setComments(prev => ({
                    ...prev,
                    [topicId]: newCommentData
                }));
            } else if (newEvent.Action == "update-likes") {
                const likes = newEvent.Data;
                console.log("Received WS likes:", likes);

                // Assuming the backend sends a new comment
                setTopics(prev =>
                    prev.map(t =>
                        t.id === topicId ? { ...t, Likes: likes } : t
                    )
                );
            } else if (newEvent.Action == "delete-topic") {
                const idTopic = newEvent.Data;
                console.log("Received WS delete topic:", idTopic);

                // Assuming the backend sends a new comment
                setTopics(prev => prev.filter(t => t.id !== idTopic));
                closeWSConnection(idTopic)
            }

        };
        ws.onclose = () => console.log(`WebSocket closed for topic ${topicId}`);
        ws.onerror = (e) => console.error("WebSocket error:", e);

        wsConnections.current[topicId] = ws;
    };

    const closeWSConnection = (topicId: number) => {
        const ws = wsConnections.current[topicId];
        if (ws) {
            ws.close();
            delete wsConnections.current[topicId];
        }
    };

    const handleAddComment = async (topicId: number) => {
        const commentText = newComment[topicId];
        if (!commentText) return;

        try {
            const res = await new serviceTopicComment().Insert({
                author: "anonymous",
                comment: commentText,
                topics_id: topicId
            } as any);

            // Optionally push to WS here if your backend is not auto-broadcasting
            setNewComment(prev => ({ ...prev, [topicId]: "" }));
            loadComments(topicId)
        } catch (err) {
            console.error("Failed to post comment:", err);
        }
    };

    const loadLikeData = async (topicId: number) => {
        try {
            const [countRes] = await Promise.all([
                new serviceTopic().GetLikes(topicId),
            ]);

            setTopics(prev =>
                prev.map(t =>
                    t.id === topicId ? { ...t, Likes: countRes.data } : t
                )
            );
        } catch (err) {
            console.error("Failed to load like data:", err);
        }
    };

    const handleLikeTopic = async (id: number) => {
        try {
            const response = await new serviceTopic().LikeTopic({
                author: "anonymous",
                topics_id: id
            });
            // setTopics(prev =>
            //     prev.map(topic =>
            //         topic.id === id
            //             ? { ...topic, Likes: (topic.Likes || 0) + (response.status === "liked" ? 1 : -1) }
            //             : topic
            //     )
            // );
        } catch (err) {
            console.error("Failed to like topic:", err);
        }
    };

    const handleDeleteComment = async (id: number, topicId: number, commentIndex: number) => {
        try {
            await new serviceTopicComment().Delete(id);
            setComments(prev => {
                const updated = [...(prev[topicId] || [])];
                updated.splice(commentIndex, 1);
                return { ...prev, [topicId]: updated };
            });
        } catch (err: any) {
            console.error(err)
        }
    };

    useEffect(() => {
        getTopics(1);

        return () => {
            // ✅ Clean up all open WebSocket connections
            Object.keys(wsConnections.current).forEach(key => {
                const topicId = parseInt(key);
                closeWSConnection(topicId);
            });
        };
    }, [key]);


    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const updates: { [key: number]: boolean } = {};

            entries.forEach(entry => {
                const topicId = Number(entry.target.getAttribute("data-topic-id"));
                updates[topicId] = entry.isIntersecting;
            });

            setVisibleTopics(prev => ({ ...prev, ...updates }));
        }, {
            threshold: 0,
            rootMargin: '0px',
        });

        // Observe each topic card
        Object.entries(topicRefs.current).forEach(([id, ref]) => {
            if (ref) {
                observer.observe(ref);
            }
        });

        // 🔥 Force recheck on next frame (important for initial render)
        requestAnimationFrame(() => {
            Object.values(topicRefs.current).forEach(ref => {
                if (ref) observer.observe(ref); // Re-observe to trigger
            });
        });

        return () => observer.disconnect();
    }, [topics]);

    useEffect(() => {
        Object.entries(visibleTopics).forEach(([id, isVisible]) => {
            const topicId = parseInt(id);
            if (isVisible) {
                openWSConnection(topicId);
            } else {
                closeWSConnection(topicId);
            }
        });
    }, [visibleTopics]);



    if (loading) return <div>Loading...</div>;

    return (
        <ul>
            {topics.map(topic => (

                <Card
                    key={topic.id}
                    data-topic-id={topic.id}
                    ref={el => (topicRefs.current[topic.id] = el)}
                    className="p-5 mb-4"
                >
                    <CardHeader>
                        <CardTitle>{topic.Title}</CardTitle>
                    </CardHeader>
                    <CardContent>{topic.content}</CardContent>
                    <CardFooter className="flex flex-col gap-2 items-start">
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLikeTopic(topic.id)}
                            >
                                👍 Like
                            </Button>
                            <span className="text-sm text-gray-600">
                                {topic.Likes || 0} {topic.Likes === 1 ? "like" : "likes"}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={() => handleToggleComment(topic.id)} size="sm">
                                {openComment[topic.id] ? "Hide" : "Comment"}
                            </Button>
                            <Button onClick={() => handleDeleteTopic(topic.id)} size="sm" variant="destructive">
                                🗑️ Delete
                            </Button>
                        </div>

                        {openComment[topic.id] && (
                            <div className="w-full">
                                <Input
                                    placeholder="Write a comment..."
                                    value={newComment[topic.id] || ""}
                                    onChange={(e) =>
                                        setNewComment(prev => ({ ...prev, [topic.id]: e.target.value }))
                                    }
                                    className="mb-2"
                                />
                                <Button size="sm" onClick={() => handleAddComment(topic.id)}>Post</Button>

                                <div className="mt-3 space-y-2">
                                    {(comments[topic.id] || []).map((c, index) => (
                                        <div key={c.id} className="border rounded p-3 bg-muted">
                                            <div className="text-sm text-gray-700">{c.comment}</div>
                                            <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                                                <span>by {c.author}</span>
                                                <span>{new Date(c.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className="mt-1 text-right">
                                                <button
                                                    className="text-red-500 text-xs hover:underline"
                                                    onClick={() => handleDeleteComment(c.id, topic.id, index)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardFooter>
                </Card>
            ))}
            {hasMore && (
                <div className="text-center mt-4">
                    <Button onClick={handleLoadMore} size="sm">
                        Load More
                    </Button>
                </div>
            )}
        </ul>
    ) ;
};

const TopicForm = ({ onTopicCreated }: { onTopicCreated: () => void }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) return;

        try {
            setLoading(true);
            await new serviceTopic().Insert({
                title: title,
                content,
                author: "anonymous",
                updated_at: null,
                created_at: null,
                id: null
            });            
            setTitle("");
            setContent("");
            onTopicCreated();
        } catch (err) {
            console.error("Failed to create topic:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-6">
            <Input
                placeholder="Judul Topic"
                className="mb-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
                placeholder="Deskripsi / isi konten"
                className="mb-2"
                value={content}
                onChange={(e) => setContent(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Posting..." : "Buat Topik"}
            </Button>
        </div>
    );
};

export default function WelcomePage() {
    const [refreshKey, setRefreshKey] = useState(0);
    return (
        <>
            <div className="mx-10">
                <TopicForm onTopicCreated={() => { setRefreshKey(prev => prev + 1) }} />
                <TopicList key={refreshKey} />
            </div>

        </>
    )
}