import {io} from 'socket.io-client';

export const initSocket = async () => {
    return io("https://code-collab-th6k.onrender.com");
}