/**
 * Docker stream utilities for handling container exec output
 */

/**
 * Cleans Docker stream output by removing Docker multiplexing header bytes.
 * Docker streams prefix each chunk with 8 bytes:
 * - Byte 0: stream type (0=stdin, 1=stdout, 2=stderr)
 * - Bytes 1-3: padding (always 0)
 * - Bytes 4-7: payload size (uint32 big-endian)
 * 
 * This function removes these control characters (0x00-0x08) from the output.
 * 
 * @param output - Raw output from Docker exec stream
 * @returns Cleaned output string
 */
export function cleanDockerStreamOutput(output: string): string {
  return output.replace(/[\x00-\x08]/g, "").trim();
}

/**
 * Reads output from a Docker exec stream and returns the cleaned result
 * 
 * @param stream - Docker exec stream
 * @returns Promise resolving to cleaned output string
 */
export async function readDockerStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    
    stream.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    stream.on("end", () => {
      resolve(cleanDockerStreamOutput(output));
    });

    stream.on("error", reject);
  });
}
