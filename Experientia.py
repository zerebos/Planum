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

try:
    import uvloop
except ImportError:
    pass
else:
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

bot = DiscordBot(command_prefix=None, description=None, pm_help=False, help_attrs=dict(hidden=True))

if __name__ == '__main__':
    bot.load_cogs()
    bot.run()
