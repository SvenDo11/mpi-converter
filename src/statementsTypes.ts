export interface MPI_SendType {
    buf: string;
    count: string;
    datatype: string;
    dest: string;
    tag: string;
    comm: string;
}

export interface MPI_RecvType {
    buf: string;
    count: string;
    datatype: string;
    source: string;
    tag: string;
    comm: string;
    status: string;
}

export enum StatementType {
    MPI_Send,
    MPI_Recv,
    Other,
}
