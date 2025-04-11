import api from '@/lib/api';
import { Topic } from '@/models/topic';

export class serviceTopic {
    async Get (current_page = 1, limit = 3) {
        const response = await api.get(`/api/v1/topic?page=${current_page}&limit=${limit}`);
        return response.data;
    };

    async Insert (data: Topic) {
        const response = await api.post('/api/v1/topic', data);
        return response.data;
    };

    async Delete (id: number) {
        const response = await api.delete(`/api/v1/topic/${id}`);
        return response.data;
    };

    async GetLikes (id: number) {
        const response = await api.get(`/api/v1/topic/likes/${id}`);
        return response.data;
    };
    async LikeTopic (data: {
        author: string,
        topics_id: number
    }) {
        const response = await api.post('/api/v1/topic/like_topic', data);
        return response.data;
 
    };
}
