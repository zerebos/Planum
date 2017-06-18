#!/usr/bin/python3

import asyncio
import copy
import datetime
import sys
import traceback

import discord
from discord.ext import commands


from discordbot.discordbot import DiscordBot
from discordbot.bot_utils import checks

description = """
Experience system based around sending messages and gaining roles.
"""

try:
    import uvloop
except ImportError:
    pass
else:
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

cogs = [
    'cogs.levels'
]

prefix = '~'
bot = DiscordBot(command_prefix=prefix, description=description, pm_help=False, help_attrs=dict(hidden=True))

if __name__ == '__main__':
    bot.load_cogs(cogs)
    bot.run()
