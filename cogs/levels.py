from collections import OrderedDict
import discordbot


class Levels:
    """Level manager."""

    def __init__(self, bot):
        self.bot = bot
        self.config = discordbot.Config('roles.json', loop=bot.loop, directory="data")
        self.data = discordbot.Config('levels.json', loop=bot.loop, directory="data")

    async def on_message(self, message):
        if message.author.bot or message.channel.is_private or not self.config.get(message.server.id, {}).get("ranks", {}):
            return

        if message.channel.id in self.bot.get_cog("BotAdmin").config.get('ignored', []):
            return

        if not message.content.startswith(self.bot.command_prefix) and discordbot.utilities.wordcount(message.content) >= 3:
            await self.increase_xp(message.author, message.channel, message.server)

    async def on_member_join(self, member):
        await self._addplayer(member, member.server)

    async def _addplayer(self, member, server):
        roles = self.config.get(server.id, {}).get("ranks", [])
        player = {'id': member.id, 'level': 1, 'xp': 0}
        await self._ensurerole(roles, player, member, server)
        return player

    def _get_rank(self, ranks, player, member, server):
        designated = {}
        all_roles = []
        ranks = sorted(ranks, key=lambda x: x['start_level'])
        for rank in ranks:
            all_roles.append(discordbot.utils.find(lambda r: r.name == rank['role'], server.roles))
            if player['level'] >= rank['start_level']:
                designated = rank
        member_roles = member.roles
        new_roles = [x for x in member_roles if x not in all_roles]
        current_role = discordbot.utils.find(lambda r: r.name == designated['role'], server.roles)
        new_roles.append(current_role)
        return (designated, new_roles)

    async def _ensurerole(self, roles, player, member, server):
        designated, new_roles = self._get_rank(roles, player, member, server)
        await self.bot.replace_roles(member, *new_roles)
        return designated

    async def increase_xp(self, member, channel, server, amount=None):
        players = self.data.get(server.id, {})
        player = players.get(member.id, {})
        if not player:
            player = await self._addplayer(member, server)
        ranks = self.config.get(server.id, {}).get("ranks", [])
        rank_before = await self._ensurerole(ranks, player, member, server)

        if not rank_before['xp_per_message'] or not rank_before['xp_per_level']:
            return

        per_msg = amount if amount else rank_before['xp_per_message']
        player['xp'] = player['xp'] + per_msg
        level_before = player['level']


        while True:
            current_rank, _ = self._get_rank(ranks, player, member, server)
            per_level = current_rank['xp_per_level']
            if player['xp'] - per_level < 0:
                break
            player['xp'] = player['xp'] - per_level
            player['level'] += 1

        if player['level'] != level_before:
            default_message = self.config.get(server.id, {}).get("meta", {}).get("level_message", "Congratulations, {name}, you are now level {level}.")
            message = current_rank.get("level_message", default_message)
            await self.bot.send_message(channel, message.format(name=member.display_name, mention=member.mention, level=player['level']))

        if rank_before != current_rank:
            current_rank = await self._ensurerole(ranks, player, member, server)
            default_message = self.config.get(server.id, {}).get("meta", {}).get("rank_message", "You have been awarded with the role of {role}")
            message = current_rank.get("message", default_message)
            await self.bot.send_message(member, message.format(name=member.display_name, mention=member.mention, role=current_rank['role']))


        players[member.id] = player
        await self.data.put(server.id, players)

    @discordbot.command(pass_context=True, no_pm=True, aliases=["leaders"])
    async def leaderboard(self, ctx):
        """Shows top peeps"""

        players = self.data.get(ctx.message.server.id, {})
        players = OrderedDict(sorted(players.items(), key=lambda x: (x[1]['level'],x[1]['xp']), reverse=True))

        peeps = []
        for p in players:
            user = ctx.message.server.get_member(p)
            if not user:
                continue
            name = user.display_name
            level = "Level: " + str(players[p]['level'])
            xp = "XP: " + str(players[p]['xp'])
            info = [name, level, xp]
            peeps.append(' | '.join(info))
        try:
            pager = discordbot.Pages(self.bot, message=ctx.message, entries=peeps, per_page=10)
            pager.embed.colour = 0x738bd7  # blurple
            pager.embed.set_author(name=ctx.message.server.name + " Leaderboard", icon_url=ctx.message.server.icon_url)
            await pager.paginate()

        except Exception as e:
            await self.bot.say(e)

    @discordbot.command(pass_context=True, no_pm=True)
    @discordbot.checks.admin_or_permissions(manage_server=True)
    async def givexp(self, ctx, player : discordbot.Member, amount : int):
        """Awards XP to a player"""
        await self.increase_xp(player, ctx.message.channel, ctx.message.server, amount=amount)


    # @discordbot.command(pass_context=True, no_pm=True)
    # @discordbot.check.admin_or_permissions(manage_server=True)
    # async def addrank(self, ctx, *, role : str):
    #     """Interactively adds a rank"""
    #
    #     server = ctx.message.server
    #     server_role = discordbot.utils.find(lambda r: r.name == role, server.roles)
    #
    #     if not server_role:
    #         await self.bot.responses.failure(message="The role '{}' has not been setup yet. Please setup the role before using it as a rank.".format(role))
    #         return
    #
    #     data = self.config.get(ctx.message.server.id, {})
    #     all_roles = data.get("roles", {})
    #
    #     if all_roles.get(role, {}):
    #         await self.bot.responses.failure(message="Rank '{}' already exists.".format(role))
    #
    #     def intcheck(msg):
    #         try:
    #             int(msg.content)
    #         except ValueError:
    #             return False
    #         else:
    #             return True
    #     await self.bot.say("Okay, at what level should this rank be awarded?")
    #     response = await self.bot.wait_for_message(author=ctx.message.author, check=intcheck)
    #
    #     reactions = []
    #     def check(reaction, user):
    #         if str(reaction.emoji) != "\U000023f9":
    #             reactions.append(reaction.emoji)
    #             return False
    #         else:
    #             return user == ctx.message.author
    #
    #     msg = await self.bot.say("Awesome! Now react to this message any reactions I should have to '{}'. (React \U000023f9 to stop)".format(reactor))
    #     await self.bot.wait_for_reaction(message=msg, check=check)
    #
    #     for i, reaction in enumerate(reactions):
    #         reaction = reaction if isinstance(reaction, str) else reaction.name + ":" + str(reaction.id)
    #         await self.bot.add_reaction(ctx.message, reaction)
    #         reactions[i] = reaction
    #
    #     if response:
    #         keyword["response"] = response.content if response.content.lower() != "$none" else ""
    #     keyword["reaction"] = reactions
    #     data[reactor] = keyword
    #     await self.config.put(ctx.message.server.id, data)
    #
    #     await self.bot.responses.success(message="Reaction '{}' has been added.".format(reactor))


def setup(bot):
    bot.add_cog(Levels(bot))
