import api from '@/lib/api';

export class serviceTopicComment {
    async Delete (id) {
        const response = await api.delete(`/api/v1/topic_comment/${id}`);
        return response.data;
    };

    async Insert (data) {
        const response = await api.post('/api/v1/topic_comment', data);
        return response.data;
    };

    async GetByTopicId (topic_id: any) {
        const response = await api.get(`/api/v1/topic_comment/by-topic-id/${topic_id}`);
        return response.data;
    };
}