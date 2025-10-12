// src/utils/asyncToolHelper.ts
import logger from '../logger.js';
import { taskQueue } from '../queue.js';
import { EnqueueTaskError, getErrDetails } from './errorUtils.js';
/**
 * Ajoute une tâche à la file d'attente BullMQ.
 */
export async function enqueueTask(args) {
    const { params, auth, taskId, toolName, cbUrl } = args;
    const log = logger.child({
        clientIp: auth?.clientIp,
        tool: toolName,
        taskId,
        proc: 'task-producer',
        cbUrl: !!cbUrl,
    });
    const jobData = { params, auth, taskId, toolName, cbUrl };
    try {
        const job = await taskQueue.add(toolName, jobData, { jobId: taskId });
        log.info({ jobId: job.id, queue: taskQueue.name }, `Tâche ajoutée à la file d'attente.`);
        return job.id;
    }
    catch (error) {
        const errDetails = getErrDetails(error);
        log.error({ err: errDetails, toolName, taskId }, "Échec de l'ajout de la tâche à la file d'attente.");
        throw new EnqueueTaskError(`L'ajout de la tâche ${taskId} pour ${toolName} à la file d'attente a échoué : ${errDetails.message}`, { originalError: errDetails, toolName, taskId });
    }
}
//# sourceMappingURL=asyncToolHelper.js.map