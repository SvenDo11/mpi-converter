import { MPI_SendType, MPI_RecvType } from "./statementsTypes";

export function sendToIsend(sendSmt: MPI_SendType, requestName:string): string {
    let outstr = "MPI_Isend(";
    outstr += sendSmt.buf + ", ";
    outstr += sendSmt.count + ", ";
    outstr += sendSmt.datatype + ", ";
    outstr += sendSmt.dest + ", ";
    outstr += sendSmt.tag + ", ";
    outstr += sendSmt.comm + ", ";
    outstr += "&" + requestName + ");"

    return outstr;
}

export function recvToIrecv(sendSmt: MPI_RecvType, requestName:string): string {
    let outstr = "MPI_Isend(";
    outstr += sendSmt.buf + ", ";
    outstr += sendSmt.count + ", ";
    outstr += sendSmt.datatype + ", ";
    outstr += sendSmt.source + ", ";
    outstr += sendSmt.tag + ", ";
    outstr += sendSmt.comm + ", ";
    outstr += "&" + requestName + ");";

    return outstr;
}