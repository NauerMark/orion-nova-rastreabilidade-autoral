"""Run locally: python server.py. No remote service is implied."""
from mcp.server.fastmcp import FastMCP
from archive import search_archive, get_document, get_dilemma
mcp=FastMCP('THE BETWEEN — attributed public archive')
mcp.tool()(search_archive)
mcp.tool()(get_document)
mcp.tool()(get_dilemma)
if __name__=='__main__':
    mcp.run(transport='stdio')
