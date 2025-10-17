import { beforeEach, describe, it, expect, vi } from 'vitest';

import ShaderReader from './ShaderReader';
import { Buffer } from 'buffer';

describe('ShaderReader', () => {
    let fileSystemMock: any;
    let shaderReader: ShaderReader;

    beforeEach(() => {
        fileSystemMock = {
            findFiles: vi.fn(),
            readFile: vi.fn(),
        };
        shaderReader = new ShaderReader(fileSystemMock);
    });

    describe('parseShader', () => {
        it('parses a simple shader with params and stages', () => {
            const shaderText = `
myShader
{
    param1
    param2
    {
        stageParam1
        stageParam2
    }
    param3
}
`;
            const buffer = Buffer.from(shaderText, 'utf-8');
            const result = shaderReader.extractShaders(buffer);

            expect(result).toBeInstanceOf(Map);
            expect(result).not.toBeNull();
            expect(result.has('myShader')).toBe(true);

            const shader = result.get('myShader');
            expect(shader.name).toBe('myShader');
            expect(shader.params).toEqual(['param1', 'param2', 'param3']);
            expect(shader.stages.length).toBe(1);
            expect(shader.stages[0].lines).toEqual(['stageParam1', 'stageParam2']);
        });

        it('deals with bad rtcw shader', () => {
            const shaderText = `
myShader
{
    param1
    param2
    {
        stageParam1
        stageParam2
        // blah }
    {
        stageParam3
    }
    param3
}
`;
            const buffer = Buffer.from(shaderText, 'utf-8');
            const result = shaderReader.extractShaders(buffer);

            expect(result).toBeInstanceOf(Map);
            expect(result).not.toBeNull();
            expect(result.has('myShader')).toBe(true);

            const shader = result.get('myShader');
            expect(shader.name).toBe('myShader');
            expect(shader.params).toEqual(['param1', 'param2', 'param3']);
            expect(shader.stages.length).toBe(2);
            expect(shader.stages[0].lines).toEqual(['stageParam1', 'stageParam2']);
            expect(shader.stages[1].lines).toEqual(['stageParam3']);
        });

        it('deals with rtcw shader where open brace is on the same line', () => {
            const shaderText = `
myShader
{
    param1
    param2
    { stageParam1
        stageParam2
    }
    {
        stageParam3
    }
    param3
}
`;
            const buffer = Buffer.from(shaderText, 'utf-8');
            const result = shaderReader.extractShaders(buffer);

            expect(result).toBeInstanceOf(Map);
            expect(result).not.toBeNull();
            expect(result.has('myShader')).toBe(true);

            const shader = result.get('myShader');
            expect(shader.name).toBe('myShader');
            expect(shader.params).toEqual(['param1', 'param2', 'param3']);
            expect(shader.stages.length).toBe(2);
            expect(shader.stages[0].lines).toEqual(['stageParam1', 'stageParam2']);
            expect(shader.stages[1].lines).toEqual(['stageParam3']);
        });

        it('skips comments and empty lines', () => {
            const shaderText = `
// This is a comment
myShader
{
    // param comment
    param1

    {
        // stage comment
        stageParam1
    }
}
`;
            const buffer = Buffer.from(shaderText, 'utf-8');
            const result = shaderReader.extractShaders(buffer);
            expect(result).not.toBeNull();
            expect(result.has('myShader')).toBe(true);
            const shader = result.get('myShader');
            expect(shader.params).toEqual(['param1']);
            expect(shader.stages.length).toBe(1);
            expect(shader.stages[0].lines).toEqual(['stageParam1']);
        });

        it('returns null on unexpected depth', () => {
            const shaderText = `
myShader
unexpectedLine
{
    param1
}
`;
            const buffer = Buffer.from(shaderText, 'utf-8');
            const result = shaderReader.extractShaders(buffer);
            expect(result).toBeNull();
        });

        it('parses multiple shaders', () => {
            const shaderText = `
shaderA
{
    paramA
}
shaderB
{
    paramB
    {
        stageB
    }
}
`;
            const buffer = Buffer.from(shaderText, 'utf-8');
            const result = shaderReader.extractShaders(buffer);
            expect(result).not.toBeNull();
            expect(result.has('shaderA')).toBe(true);
            expect(result.has('shaderB')).toBe(true);

            expect(result.get('shaderA').params).toEqual(['paramA']);
            expect(result.get('shaderB').params).toEqual(['paramB']);
            expect(result.get('shaderB').stages[0].lines).toEqual(['stageB']);
        });
    });

    describe('load', () => {
        it('returns undefined if file not found', async () => {
            fileSystemMock.readFile.mockResolvedValue(undefined);
            const result = await shaderReader.load('missing.shader');
            expect(result).toBeUndefined();
        });

        it('returns undefined if parseShader fails', async () => {
            fileSystemMock.readFile.mockResolvedValue(Buffer.from('shader\nunexpected', 'utf-8'));
            const result = await shaderReader.load('bad.shader');
            expect(result).toBeUndefined();
        });

        it('returns parsed shader map', async () => {
            const shaderText = `
shaderA
{
    paramA
}
`;
            fileSystemMock.readFile.mockResolvedValue(Buffer.from(shaderText, 'utf-8'));
            const result = await shaderReader.load('shaderA.shader');
            expect(result).not.toBeUndefined();
            expect(result).toBeInstanceOf(Map);
            expect(result.has('shaderA')).toBe(true);
        });
    });

    describe('loadShaders', () => {
        it('loads multiple shader files and merges results', async () => {
            const shaderTextA = `
shaderA
{
    paramA
}
`;
            const shaderTextB = `
shaderB
{
    paramB
}
`;
            fileSystemMock.readFile
                .mockResolvedValueOnce(Buffer.from(shaderTextA, 'utf-8'))
                .mockResolvedValueOnce(Buffer.from(shaderTextB, 'utf-8'));

            const result = await shaderReader.loadShaders(['a.shader', 'b.shader']);
            expect(result.has('shaderA')).toBe(true);
            expect(result.has('shaderB')).toBe(true);
        });
    });

    describe('loadAllShaders', () => {
        it('finds shader files and loads them', async () => {
            fileSystemMock.findFiles.mockReturnValue(['a.shader', 'b.shader']);
            fileSystemMock.readFile
                .mockResolvedValueOnce(Buffer.from('shaderA\n{\n}', 'utf-8'))
                .mockResolvedValueOnce(Buffer.from('shaderB\n{\n}', 'utf-8'));

            const result = await shaderReader.loadAllShaders();
            expect(fileSystemMock.findFiles).toHaveBeenCalledWith('scripts/', '.shader');
            expect(result.has('shaderA')).toBe(true);
            expect(result.has('shaderB')).toBe(true);
        });
    });
});